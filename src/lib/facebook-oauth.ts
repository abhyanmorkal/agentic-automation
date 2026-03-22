import ky from "ky";

const FB_API = "https://graph.facebook.com/v22.0";

/**
 * Facebook OAuth flow — two modes depending on FACEBOOK_CONFIG_ID:
 *
 * Mode 1 — Embedded Signup (preferred, use this when you have a Config ID):
 *   Set FACEBOOK_CONFIG_ID in .env (created in your App Dashboard under
 *   Facebook Login → Settings → "Login with Embedded Signup" config).
 *   Permissions are pre-configured in the Config and NOT passed as scope params.
 *   This is why passing scope= causes "Invalid Scopes" — don't mix them.
 *
 * Mode 2 — Standard OAuth (fallback, no Config ID):
 *   Each permission in FACEBOOK_APP_SCOPES must be individually enabled in
 *   App Review → Permissions and Features (even for dev-mode testing).
 *   Standard Access: pages_show_list, pages_manage_ads, pages_read_engagement
 *   Advanced Access: leads_retrieval, pages_manage_metadata (need App Review)
 */

export function getFacebookAuthUrl(state: string): string {
  const appId = process.env.FACEBOOK_APP_ID;
  const configId = process.env.FACEBOOK_CONFIG_ID?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!appId) throw new Error("FACEBOOK_APP_ID is not configured");

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: `${appUrl}/api/auth/facebook/callback`,
    state,
    response_type: "code",
    display: "popup",
  });

  if (configId) {
    // Embedded Signup: permissions are baked into the Config ID — do NOT add scope.
    params.set("config_id", configId);
  } else {
    // Standard OAuth: specify scopes. Each must be enabled in your App Dashboard first.
    const scopes =
      process.env.FACEBOOK_APP_SCOPES?.trim() ||
      "email,public_profile,pages_show_list,pages_manage_ads,pages_read_engagement";
    params.set("scope", scopes);
  }

  return `https://www.facebook.com/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!appId || !appSecret) throw new Error("FACEBOOK_APP_ID or FACEBOOK_APP_SECRET is not configured");

  const response = await ky
    .get(`${FB_API}/oauth/access_token`, {
      searchParams: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: `${appUrl}/api/auth/facebook/callback`,
        code,
      },
    })
    .json<{ access_token: string; token_type: string }>();

  return response.access_token;
}

/**
 * Exchange a short-lived user token (~1h) for a long-lived token (~60 days).
 */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; expires_in: number }> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) throw new Error("FACEBOOK_APP_ID or FACEBOOK_APP_SECRET is not configured");

  const response = await ky
    .get(`${FB_API}/oauth/access_token`, {
      searchParams: {
        grant_type: "fb_exchange_token",
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      },
    })
    .json<{ access_token: string; token_type: string; expires_in: number }>();

  return { access_token: response.access_token, expires_in: response.expires_in };
}

/**
 * Get the Facebook user's name for naming the saved credential.
 */
export async function getFacebookUserName(accessToken: string): Promise<string> {
  const response = await ky
    .get(`${FB_API}/me`, {
      searchParams: {
        access_token: accessToken,
        fields: "id,name",
      },
    })
    .json<{ id: string; name: string }>();

  return response.name;
}
