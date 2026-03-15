import { exchangeCodeForToken, exchangeForLongLivedToken, getFacebookUserName } from "@/lib/facebook-oauth";
import { encrypt } from "@/lib/encryption";
import prisma from "@/lib/db";
import { CredentialType } from "@/generated/prisma";

function htmlResponse(script: string) {
  return new Response(
    `<!DOCTYPE html>
<html>
  <head>
    <title>Connecting Facebook...</title>
    <style>
      body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f0f2f5; }
      .card { background: white; border-radius: 12px; padding: 32px 40px; text-align: center; box-shadow: 0 2px 20px rgba(0,0,0,.12); max-width: 360px; }
      .spinner { width: 40px; height: 40px; border: 3px solid #e4e6eb; border-top-color: #1877f2; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
      @keyframes spin { to { transform: rotate(360deg); } }
      p { color: #65676b; margin: 0; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner"></div>
      <p>Connecting your Facebook account...</p>
    </div>
    <script>${script}</script>
  </body>
</html>`,
    { headers: { "Content-Type": "text/html" } },
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return htmlResponse(
      `window.opener?.postMessage({type:'facebook_auth_error',error:${JSON.stringify(errorDescription ?? error)}},'*');setTimeout(()=>window.close(),1500);`,
    );
  }

  if (!code || !state) {
    return htmlResponse(
      `window.opener?.postMessage({type:'facebook_auth_error',error:'Missing code or state'},'*');setTimeout(()=>window.close(),1500);`,
    );
  }

  let userId: string;
  let credentialName: string;

  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    userId = decoded.userId;
    credentialName = decoded.name || "My Facebook Account";
  } catch {
    return htmlResponse(
      `window.opener?.postMessage({type:'facebook_auth_error',error:'Invalid state parameter'},'*');setTimeout(()=>window.close(),1500);`,
    );
  }

  try {
    // Exchange code → short-lived token → long-lived token (~60 days)
    const shortToken = await exchangeCodeForToken(code);
    const longToken = await exchangeForLongLivedToken(shortToken);

    // Get Facebook user's name for labelling the credential
    const fbName = await getFacebookUserName(longToken).catch(() => null);
    const name = fbName ? `Facebook — ${fbName}` : credentialName;

    const credential = await prisma.credential.create({
      data: {
        name,
        type: CredentialType.META_ACCESS_TOKEN,
        value: encrypt(longToken),
        userId,
      },
    });

    return htmlResponse(
      `window.opener?.postMessage({type:'facebook_auth_success',credentialId:${JSON.stringify(credential.id)},credentialName:${JSON.stringify(credential.name)}},'*');setTimeout(()=>window.close(),800);`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token exchange failed";
    return htmlResponse(
      `window.opener?.postMessage({type:'facebook_auth_error',error:${JSON.stringify(message)}},'*');setTimeout(()=>window.close(),2000);`,
    );
  }
}
