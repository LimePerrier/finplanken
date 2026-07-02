import { json, requireAdmin } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  if (!requireAdmin(request, env)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await env.DB.prepare(
    `select
      users.id,
      users.email,
      users.name,
      users.role,
      users.status,
      users.created_at,
      users.updated_at,
      count(distinct client_records.id) as record_count,
      max(client_records.created_at) as latest_record_at,
      count(distinct sessions.id) as active_session_count
    from users
    left join client_records on client_records.user_id = users.id
    left join sessions on sessions.user_id = users.id and sessions.expires_at > ?
    where users.role = 'client'
    group by users.id
    order by users.created_at desc`
  ).bind(new Date().toISOString()).all();

  return json({ clients: result.results || [] });
}
