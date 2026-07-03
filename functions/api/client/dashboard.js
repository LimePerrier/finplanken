import { getUserFromSession, json } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(request, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const dashboard = await env.DB.prepare(
    "select plan_data_json, updated_at from client_dashboard_data where user_id = ? order by updated_at desc limit 1"
  ).bind(user.id).first();

  if (!dashboard) {
    return json({ planData: [], updatedAt: null });
  }

  let planData = [];
  try {
    planData = JSON.parse(dashboard.plan_data_json || "[]");
  } catch (error) {
    planData = [];
  }

  return json({ planData, updatedAt: dashboard.updated_at });
}
