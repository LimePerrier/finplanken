import { createSession, hashPassword, json, readJson, sessionCookie, sha256 } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (!token || password.length < 10) {
    return json({ error: "Use the invite link and enter a password at least 10 characters long." }, { status: 400 });
  }

  const tokenHash = await sha256(token);
  const invite = await env.DB.prepare(
    `select invites.id, invites.user_id, invites.expires_at, invites.used_at, users.email
     from invites
     join users on users.id = invites.user_id
     where invites.token_hash = ?`
  ).bind(tokenHash).first();

  if (!invite || invite.used_at || invite.expires_at <= new Date().toISOString()) {
    return json({ error: "This invite link is invalid or expired." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  await env.DB.prepare(
    "update users set password_hash = ?, status = 'active', updated_at = ? where id = ?"
  ).bind(passwordHash, now, invite.user_id).run();
  await env.DB.prepare("update invites set used_at = ? where id = ?").bind(now, invite.id).run();

  const session = await createSession(env, invite.user_id);
  return json(
    { ok: true, email: invite.email },
    { headers: { "set-cookie": sessionCookie(session.token, request) } }
  );
}
