import { json } from "../../_lib/auth.js";

export async function onRequestGet({ env }) {
  return json({
    hasAdminInviteToken: Boolean(env.ADMIN_INVITE_TOKEN),
    hasDb: Boolean(env.DB),
  });
}
