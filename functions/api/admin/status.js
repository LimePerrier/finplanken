import { json } from "../../_lib/auth.js";

export async function onRequestGet({ env }) {
  return json({
    hasAdminInviteToken: Boolean(env.ADMIN_INVITE_TOKEN),
    hasDb: Boolean(env.DB),
    hasInviteFrom: Boolean(env.INVITE_FROM),
    hasCloudflareAccountId: Boolean(env.CLOUDFLARE_ACCOUNT_ID),
    hasCloudflareEmailApiToken: Boolean(env.CLOUDFLARE_EMAIL_API_TOKEN),
    hasEmailConfig: Boolean(env.INVITE_FROM && env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_EMAIL_API_TOKEN),
  });
}
