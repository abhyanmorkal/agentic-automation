import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGoogleAuthUrl } from "@/lib/google-oauth";
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
  const credentialName = searchParams.get("name") || "My Google Account";
  const mode = searchParams.get("mode") === "popup" ? "popup" : "redirect";

  const { state, nonce, expiresAt } = createOAuthState({
    userId: session.user.id,
    name: credentialName,
    mode,
    provider: "google",
  });
  const cookieStore = await cookies();
  cookieStore.set(
    getOAuthStateCookieName("google"),
    nonce,
    getOAuthStateCookieOptions(expiresAt),
  );

  redirect(getGoogleAuthUrl(state));
}
