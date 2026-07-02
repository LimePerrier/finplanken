import { createSession, json, readJson, sessionCookie, verifyPassword } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  const user = await env.DB.prepare(
    "select id, email, password_hash, status from users where email = ?"
  ).bind(email).first();

  if (!user || user.status !== "active" || !(await verifyPassword(password, user.password_hash))) {
    return json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  const session = await createSession(env, user.id);
  return json(
    { ok: true, email: user.email },
    { headers: { "set-cookie": sessionCookie(session.token, request) } }
  );
}
