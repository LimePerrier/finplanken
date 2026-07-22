// Small email helper shared by checkout + subscription flows.
// Mirrors the two sending paths already used by the admin invite:
//   1) an `EMAIL` send-binding, if bound
//   2) the Cloudflare Email REST API, if account + token are set
// If neither is configured it resolves { sent:false } so callers can
// fall back to showing a link on-screen rather than failing.
export async function sendEmail(env, { to, from, subject, text, html }) {
  const sender = from || env.INVITE_FROM;
  if (!sender || !to) return { sent: false, reason: "not_configured" };

  if (env.EMAIL) {
    try {
      await env.EMAIL.send({ to, from: sender, subject, text, html });
      return { sent: true };
    } catch (err) {
      return { sent: false, reason: "send_binding_failed", error: String(err) };
    }
  }

  if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_EMAIL_API_TOKEN) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/email/sending/send`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.CLOUDFLARE_EMAIL_API_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ to, from: sender, subject, text, html }),
      }
    );
    if (!res.ok) {
      return { sent: false, reason: "rest_failed", error: await res.text() };
    }
    return { sent: true };
  }

  return { sent: false, reason: "not_configured" };
}
