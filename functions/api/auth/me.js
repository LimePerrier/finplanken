import { getUserFromSession, json } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(request, env);
  if (!user) return json({ user: null }, { status: 401 });
  return json({ user });
}
