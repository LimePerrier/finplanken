import { appUrl, json, randomId, randomToken, requireAdmin, sha256 } from "../../../../_lib/auth.js";

export async function onRequestPost({ request, env, params }) {
  if (!requireAdmin(request, env)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await env.DB.prepare(
    "select id, email, name, status from users where id = ? and role = 'client'"
  ).bind(params.id).first();
  if (!user) return json({ error: "Client not found." }, { status: 404 });

  const token = randomToken();
  const tokenHash = await sha256(token);
  const inviteId = randomId("inv_");
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

  await env.DB.prepare(
    "update users set password_hash = null, status = 'invited', updated_at = ? where id = ?"
  ).bind(now, params.id).run();
  await env.DB.prepare("delete from sessions where user_id = ?").bind(params.id).run();
  await env.DB.prepare(
    "update invites set used_at = ? where user_id = ? and used_at is null"
  ).bind(now, params.id).run();
  await env.DB.prepare(
    "insert into invites (id, user_id, email, token_hash, expires_at) values (?, ?, ?, ?, ?)"
  ).bind(inviteId, params.id, user.email, tokenHash, expiresAt).run();

  const resetUrl = `${appUrl(request, env)}/accept-invite.html?token=${encodeURIComponent(token)}`;
  let emailSent = false;

  if (env.EMAIL && env.INVITE_FROM) {
    await env.EMAIL.send({
      to: user.email,
      from: env.INVITE_FROM,
      subject: "Reset your Bracket Planning portal password",
      text: `Use this secure link to set a new Bracket Planning portal password:\n${resetUrl}\n\nThis link expires in 7 days.`,
      html: `<p>Use this secure link to set a new Bracket Planning portal password:</p><p><a href="${resetUrl}">Set a new password</a></p><p>This link expires in 7 days.</p>`,
    });
    emailSent = true;
  } else if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_EMAIL_API_TOKEN && env.INVITE_FROM) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/email/sending/send`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.CLOUDFLARE_EMAIL_API_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          to: user.email,
          from: env.INVITE_FROM,
          subject: "Reset your Bracket Planning portal password",
          text: `Use this secure link to set a new Bracket Planning portal password:\n${resetUrl}\n\nThis link expires in 7 days.`,
          html: `<p>Use this secure link to set a new Bracket Planning portal password:</p><p><a href="${resetUrl}">Set a new password</a></p><p>This link expires in 7 days.</p>`,
        }),
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      return json({ error: "Password reset link was created, but the email could not be sent.", details: errorText, resetUrl }, { status: 502 });
    }
    emailSent = true;
  }

  return json({ ok: true, emailSent, resetUrl, expiresAt });
}
