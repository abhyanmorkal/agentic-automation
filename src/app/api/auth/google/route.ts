import { auth } from "@/lib/auth";
import { getGoogleAuthUrl } from "@/lib/google-oauth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const credentialName = searchParams.get("name") || "My Google Account";

  // State encodes userId + credential name (base64 so it survives URL encoding)
  const state = Buffer.from(
    JSON.stringify({ userId: session.user.id, name: credentialName }),
  ).toString("base64url");

  redirect(getGoogleAuthUrl(state));
}
