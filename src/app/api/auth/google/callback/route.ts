import { exchangeCodeForTokens, getGoogleUserEmail } from "@/lib/google-oauth";
import { encrypt } from "@/lib/encryption";
import prisma from "@/lib/db";
import { CredentialType } from "@/generated/prisma";
import { redirect } from "next/navigation";

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

  if (!state) {
    // No state means we don't know the mode; fall back to credentials page.
    if (error) {
      return redirect(`/credentials?error=${encodeURIComponent(error)}`);
    }
    return redirect("/credentials?error=missing_state");
  }

  let userId: string;
  let mode: "popup" | "redirect" = "redirect";

  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    userId = decoded.userId;
    if (decoded.mode === "popup") {
      mode = "popup";
    }
  } catch {
    if (mode === "popup") {
      return htmlResponse(
        `window.opener?.postMessage({type:'google_auth_error',error:'Invalid state parameter'},'*');setTimeout(()=>window.close(),1500);`,
      );
    }
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
    const name = `Google — ${email}`;

    // Reuse an existing credential for this user+email instead of creating
    // duplicates every time they reconnect the same Google account.
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
          value: encrypt(tokens.refresh_token!),
          userId,
        },
      });
    } else {
      // Update the stored refresh token in case Google rotated it.
      credential = await prisma.credential.update({
        where: { id: credential.id },
        data: { value: encrypt(tokens.refresh_token!) },
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
    const message = err instanceof Error ? err.message : "token_exchange_failed";
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
