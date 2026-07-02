import { clearSessionCookie, getCookie, json, sha256 } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const token = getCookie(request, "bp_session");
  if (token) {
    const tokenHash = await sha256(token);
    await env.DB.prepare("delete from sessions where token_hash = ?").bind(tokenHash).run();
  }
  return json({ ok: true }, { headers: { "set-cookie": clearSessionCookie(request) } });
}
