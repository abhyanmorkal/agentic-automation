import { exchangeCodeForTokens, getGoogleUserEmail } from "@/lib/google-oauth";
import { encrypt } from "@/lib/encryption";
import prisma from "@/lib/db";
import { CredentialType } from "@/generated/prisma";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    redirect(`/credentials?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    redirect("/credentials?error=missing_params");
  }

  let userId: string;
  let credentialName: string;

  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    userId = decoded.userId;
    credentialName = decoded.name || "My Google Account";
  } catch {
    redirect("/credentials?error=invalid_state");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      redirect("/credentials?error=no_refresh_token");
    }

    const email = await getGoogleUserEmail(tokens.access_token);
    const name = credentialName || `Google — ${email}`;

    await prisma.credential.create({
      data: {
        name,
        type: CredentialType.GOOGLE_OAUTH,
        value: encrypt(tokens.refresh_token!),
        userId,
      },
    });

    redirect("/credentials?success=google_connected");
  } catch {
    redirect("/credentials?error=token_exchange_failed");
  }
}
