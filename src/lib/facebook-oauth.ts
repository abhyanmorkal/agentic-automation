import ky from "ky";

const FB_API = "https://graph.facebook.com/v22.0";

/**
 * Required scopes for Facebook Lead Ads.
 *
 * These match what production integrations (e.g. Pabbly, Zapier) request:
 *   - pages_show_list          — list pages the user manages
 *   - leads_retrieval          — read lead form submissions  (Advanced Access)
 *   - ads_management           — read ad campaigns / creatives
 *   - pages_manage_ads         — manage page-level ad settings
 *   - pages_read_engagement    — read page posts & engagement
 *   - pages_manage_metadata    — subscribe pages to webhooks (Advanced Access)
 *   - business_management      — access Business Manager portfolios
 *
 * All Advanced Access permissions require App Review before they work
 * in production. In dev/test mode they work for accounts added as testers.
 *
 * Two modes depending on whether FACEBOOK_CONFIG_ID is set:
 *
 * Mode 1 — Standard OAuth (recommended for Lead Ads):
 *   No FACEBOOK_CONFIG_ID in .env. Scopes are sent explicitly in the URL.
 *   Uses prompt=consent so the permission screen always appears.
 *
 * Mode 2 — Embedded Signup (has a Config ID):
 *   Set FACEBOOK_CONFIG_ID in .env. The config_id is sent alongside the
 *   scopes so that the Embedded Signup UI is used. Facebook merges the two.
 *   Note: scope + config_id together is valid on the standard dialog/oauth
 *   endpoint (unlike the business login endpoint where they conflict).
 */

/** The canonical scope list for Facebook Lead Ads integrations. */
const LEAD_ADS_SCOPES =
  "pages_show_list,leads_retrieval,ads_management,pages_manage_ads,pages_read_engagement,pages_manage_metadata,business_management";

export function getFacebookAuthUrl(state: string): string {
  const appId = process.env.FACEBOOK_APP_ID;
  const configId = process.env.FACEBOOK_CONFIG_ID?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!appId) throw new Error("FACEBOOK_APP_ID is not configured");

  // Allow overriding the scope list via env, otherwise use the Lead Ads default.
  const scopes = process.env.FACEBOOK_APP_SCOPES?.trim() || LEAD_ADS_SCOPES;

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: `${appUrl}/api/auth/facebook/callback`,
    state,
    response_type: "code",
    display: "popup",
    scope: scopes,
    // prompt=consent ensures the permission screen always shows so the user
    // can grant every requested scope (mirrors Pabbly/Zapier behaviour).
    prompt: "consent",
  });

  if (configId) {
    // When an Embedded Signup config is present, attach it so the Meta
    // Business Login UI is used. Scope is still sent — Facebook accepts
    // both params on the standard dialog/oauth endpoint.
    params.set("config_id", configId);
  }

  // Use the versioned OAuth endpoint (same as Graph API version).
  return `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`;
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
 * Get the Facebook user's id and name.
 * Used for labelling credentials and deduplication (same user → same credential row).
 */
export async function getFacebookUserInfo(accessToken: string): Promise<{ id: string; name: string }> {
  const response = await ky
    .get(`${FB_API}/me`, {
      searchParams: {
        access_token: accessToken,
        fields: "id,name",
      },
    })
    .json<{ id: string; name: string }>();

  return { id: response.id, name: response.name };
}

/**
 * Get the Facebook user's name for naming the saved credential.
 * @deprecated Use getFacebookUserInfo instead.
 */
export async function getFacebookUserName(accessToken: string): Promise<string> {
  const info = await getFacebookUserInfo(accessToken);
  return info.name;
}
