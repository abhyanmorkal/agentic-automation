import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFacebookAuthUrl } from "@/lib/facebook-oauth";
import {
  createOAuthState,
  getOAuthStateCookieName,
  getOAuthStateCookieOptions,
} from "@/lib/oauth-state";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const credentialName = searchParams.get("name") || "My Facebook Account";

  const { state, nonce, expiresAt } = createOAuthState({
    userId: session.user.id,
    name: credentialName,
    mode: "popup",
    provider: "facebook",
  });
  const cookieStore = await cookies();
  cookieStore.set(
    getOAuthStateCookieName("facebook"),
    nonce,
    getOAuthStateCookieOptions(expiresAt),
  );

  // Build the URL first — this throws a real Error if FACEBOOK_APP_ID is missing.
  // Keep redirect() outside try-catch: Next.js redirect() throws NEXT_REDIRECT
  // internally and must NOT be caught or it surfaces as an error to the caller.
  let authUrl: string;
  try {
    authUrl = getFacebookAuthUrl(state);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "FACEBOOK_APP_ID is not configured";
    return new Response(
      `<!DOCTYPE html><html><body><script>
        window.opener?.postMessage({type:'facebook_auth_error',error:${JSON.stringify(message)}},'*');
        setTimeout(()=>window.close(),1500);
      </script><p style="font-family:sans-serif;padding:2rem;color:#e00">${message}</p></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  }

  redirect(authUrl);
}
