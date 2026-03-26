import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CredentialType } from "@/generated/prisma";
import prisma from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { exchangeCodeForTokens, getGoogleUserEmail } from "@/lib/google-oauth";
import { getOAuthStateCookieName, verifyOAuthState } from "@/lib/oauth-state";

function htmlResponse(script: string) {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Google Auth</title></head><body><script>${script}</script></body></html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const cookieStore = await cookies();

  if (!state) {
    if (error) {
      return redirect(`/credentials?error=${encodeURIComponent(error)}`);
    }

    return redirect("/credentials?error=missing_state");
  }

  let userId: string;
  let credentialName: string;
  let mode: "popup" | "redirect" = "redirect";

  try {
    const decoded = verifyOAuthState(state, "google");
    const nonceCookie = cookieStore.get(
      getOAuthStateCookieName("google"),
    )?.value;

    if (!nonceCookie || nonceCookie !== decoded.nonce) {
      throw new Error("OAuth state nonce mismatch");
    }

    cookieStore.delete(getOAuthStateCookieName("google"));
    userId = decoded.userId;
    credentialName = decoded.name;
    mode = decoded.mode;
  } catch {
    return redirect("/credentials?error=invalid_state");
  }

  if (error) {
    if (mode === "popup") {
      return htmlResponse(
        `window.opener?.postMessage({type:'google_auth_error',error:${JSON.stringify(error)}},'*');setTimeout(()=>window.close(),1500);`,
      );
    }

    return redirect(`/credentials?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    if (mode === "popup") {
      return htmlResponse(
        `window.opener?.postMessage({type:'google_auth_error',error:'Missing code parameter'},'*');setTimeout(()=>window.close(),1500);`,
      );
    }

    return redirect("/credentials?error=missing_params");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      if (mode === "popup") {
        return htmlResponse(
          `window.opener?.postMessage({type:'google_auth_error',error:'No refresh token returned from Google'},'*');setTimeout(()=>window.close(),2000);`,
        );
      }

      return redirect("/credentials?error=no_refresh_token");
    }

    const email = await getGoogleUserEmail(tokens.access_token);
    const name = credentialName || `Google - ${email}`;

    let credential = await prisma.credential.findFirst({
      where: {
        userId,
        type: CredentialType.GOOGLE_OAUTH,
        name,
      },
    });

    if (!credential) {
      credential = await prisma.credential.create({
        data: {
          name,
          type: CredentialType.GOOGLE_OAUTH,
          value: encrypt(tokens.refresh_token),
          userId,
        },
      });
    } else {
      credential = await prisma.credential.update({
        where: { id: credential.id },
        data: { value: encrypt(tokens.refresh_token) },
      });
    }

    if (mode === "popup") {
      return htmlResponse(
        `window.opener?.postMessage({type:'google_auth_success',credentialId:${JSON.stringify(
          credential.id,
        )},credentialName:${JSON.stringify(
          credential.name,
        )}},'*');setTimeout(()=>window.close(),800);`,
      );
    }

    return redirect("/credentials?success=google_connected");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "token_exchange_failed";

    if (mode === "popup") {
      return htmlResponse(
        `window.opener?.postMessage({type:'google_auth_error',error:${JSON.stringify(
          message,
        )}},'*');setTimeout(()=>window.close(),2000);`,
      );
    }

    return redirect(`/credentials?error=${encodeURIComponent(message)}`);
  }
}
