PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  original_request TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS plans_session_idx ON plans(session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL UNIQUE REFERENCES plans(id),
  session_id TEXT NOT NULL,
  status TEXT NOT NULL,
  cancel_requested INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS executions_status_idx ON executions(status, created_at);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  plan_id TEXT REFERENCES plans(id),
  execution_id TEXT REFERENCES executions(id),
  session_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  role TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  byte_size INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS assets_plan_idx ON assets(plan_id, direction);
CREATE INDEX IF NOT EXISTS assets_execution_idx ON assets(execution_id, direction);

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_events(entity_type, entity_id, id);
