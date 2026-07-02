import { appUrl, json, randomId, randomToken, readJson, requireAdmin, sha256 } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_INVITE_TOKEN) {
    return json({ error: "ADMIN_INVITE_TOKEN is not configured for this deployment." }, { status: 500 });
  }

  if (!requireAdmin(request, env)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJson(request);
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Enter a valid client email." }, { status: 400 });
  }

  const userId = randomId("user_");
  const existing = await env.DB.prepare("select id, status from users where email = ?").bind(email).first();
  const finalUserId = existing?.id || userId;

  if (!existing) {
    await env.DB.prepare(
      "insert into users (id, email, name, role, status) values (?, ?, ?, 'client', 'invited')"
    ).bind(finalUserId, email, name || null).run();
  } else if (existing.status === "active") {
    return json({ error: "That client already has an active account." }, { status: 409 });
  } else if (existing.status === "disabled") {
    return json({ error: "That client account is disabled." }, { status: 409 });
  } else {
    await env.DB.prepare(
      "update users set name = coalesce(?, name), updated_at = ? where id = ?"
    ).bind(name || null, new Date().toISOString(), finalUserId).run();
  }

  const token = randomToken();
  const tokenHash = await sha256(token);
  const inviteId = randomId("inv_");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  await env.DB.prepare(
    "insert into invites (id, user_id, email, token_hash, expires_at) values (?, ?, ?, ?, ?)"
  ).bind(inviteId, finalUserId, email, tokenHash, expiresAt).run();

  const inviteUrl = `${appUrl(request, env)}/accept-invite.html?token=${encodeURIComponent(token)}`;
  let emailSent = false;

  if (env.EMAIL && env.INVITE_FROM) {
    await env.EMAIL.send({
      to: email,
      from: env.INVITE_FROM,
      subject: "Set up your Bracket Planning portal account",
      text: `Welcome to Bracket Planning.\n\nUse this secure link to set your password:\n${inviteUrl}\n\nThis link expires in 7 days.`,
      html: `<p>Welcome to Bracket Planning.</p><p><a href="${inviteUrl}">Set your portal password</a></p><p>This link expires in 7 days.</p>`,
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
          to: email,
          from: env.INVITE_FROM,
          subject: "Set up your Bracket Planning portal account",
          text: `Welcome to Bracket Planning.\n\nUse this secure link to set your password:\n${inviteUrl}\n\nThis link expires in 7 days.`,
          html: `<p>Welcome to Bracket Planning.</p><p><a href="${inviteUrl}">Set your portal password</a></p><p>This link expires in 7 days.</p>`,
        }),
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      return json({ error: "Invite was created, but the email could not be sent.", details: errorText, inviteUrl }, { status: 502 });
    }
    emailSent = true;
  }

  return json({ ok: true, emailSent, inviteUrl, expiresAt });
}
