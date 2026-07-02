create table if not exists users (
  id text primary key,
  email text not null unique,
  name text,
  role text not null default 'client' check (role in ('client', 'admin')),
  status text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  password_hash text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists invites (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at text not null,
  used_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists client_records (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  body text not null,
  record_type text not null default 'note',
  visible_to_client integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists idx_invites_token_hash on invites(token_hash);
create index if not exists idx_sessions_token_hash on sessions(token_hash);
create index if not exists idx_users_email on users(email);
create index if not exists idx_client_records_user_id on client_records(user_id);
