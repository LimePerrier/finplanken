// Shared helpers for the checkout endpoints.
import { json, randomId, randomToken, sha256 } from "./auth.js";

export { json, randomId, randomToken, sha256 };

// Load an intent and verify the caller holds its access token.
// Returns the intent row, or null if not found / token mismatch.
export async function loadIntent(env, intentId, accessToken) {
  if (!intentId || !accessToken) return null;
  const row = await env.DB.prepare("select * from checkout_intents where id = ?")
    .bind(String(intentId))
    .first();
  if (!row) return null;
  const hash = await sha256(String(accessToken));
  if (!timingSafeEqual(hash, row.access_token_hash)) return null;
  return row;
}

export function clientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    ""
  ).split(",")[0].trim();
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
