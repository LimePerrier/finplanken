const textEncoder = new TextEncoder();

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function requireAdmin(request, env) {
  const expected = String(env.ADMIN_INVITE_TOKEN || "")
    .split(/[,\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
  const header = request.headers.get("x-admin-token") || "";
  const bearer = request.headers.get("authorization") || "";
  const token = (header || bearer.replace(/^Bearer\s+/i, "")).trim();
  if (!token || expected.length === 0) return false;
  return expected.some((candidate) => safeEqual(token, candidate));
}

export function appUrl(request, env) {
  return (env.APP_URL || new URL(request.url).origin).replace(/\/$/, "");
}

export function randomId(prefix = "") {
  return `${prefix}${crypto.randomUUID()}`;
}

export function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
  return base64Url(new Uint8Array(digest));
}

export async function hashPassword(password) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const iterations = 100000;
  const key = await crypto.subtle.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );
  return `pbkdf2-sha256:${iterations}:${base64Url(salt)}:${base64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const [scheme, iterationsText, saltText, expected] = stored.split(":");
  if (scheme !== "pbkdf2-sha256" || !iterationsText || !saltText || !expected) return false;
  const salt = base64UrlToBytes(saltText);
  const iterations = Number(iterationsText);
  const key = await crypto.subtle.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );
  return safeEqual(base64Url(new Uint8Array(bits)), expected);
}

export async function createSession(env, userId) {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const id = randomId("sess_");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  await env.DB.prepare(
    "insert into sessions (id, user_id, token_hash, expires_at) values (?, ?, ?, ?)"
  ).bind(id, userId, tokenHash, expiresAt).run();
  return { token, expiresAt };
}

export function sessionCookie(token, request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `bp_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`;
}

export function clearSessionCookie(request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `bp_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function getCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

export async function getUserFromSession(request, env) {
  const token = getCookie(request, "bp_session");
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    `select users.id, users.email, users.name, users.role, users.status
     from sessions
     join users on users.id = sessions.user_id
     where sessions.token_hash = ? and sessions.expires_at > ? and users.status = 'active'`
  ).bind(tokenHash, new Date().toISOString()).first();
  return row || null;
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function base64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
