/** Per-account manifest schema (`manifests/<account>.db`). Idempotent. */
export const SCHEMA_VERSION = "1";

export const SCHEMA = `
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA busy_timeout=5000;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS account (
  account         TEXT PRIMARY KEY,
  save_path       TEXT NOT NULL,
  cookies_path    TEXT,
  media_types     TEXT NOT NULL DEFAULT 'video',           -- csv: image,video
  tabs            TEXT NOT NULL DEFAULT 'highlights,reels,stories',
  parallelism     INTEGER NOT NULL DEFAULT 2,
  elapsed_seconds REAL NOT NULL DEFAULT 0,
  network         TEXT NOT NULL DEFAULT 'instagram',       -- source provider id (instagram, tiktok, …)
  note_language   TEXT,                                    -- per-account note language override (null = global default)
  estimated_total INTEGER,                                 -- profile total (gallery-dl --simulate)
  last_synced_at  TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS item (
  post_id       TEXT PRIMARY KEY,                           -- = file stem (post id)
  media_type    TEXT NOT NULL CHECK (media_type IN ('image','video')),
  origin        TEXT NOT NULL,                              -- highlight|reel|story|post
  rel_path      TEXT,                                       -- relative to the repo root (posix)
  file_size     INTEGER,
  duration_s    REAL,
  width         INTEGER,
  height        INTEGER,
  caption       TEXT,
  posted_at     TEXT,
  thumb_path    TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','downloading','downloaded','reading','read','error')),
  retries       INTEGER NOT NULL DEFAULT 0,
  downloaded_at TEXT,
  read_at       TEXT,
  note_path     TEXT,
  error         TEXT,
  download_ms   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_item_status       ON item(status);
CREATE INDEX IF NOT EXISTS idx_item_origin_media ON item(origin, media_type);
CREATE INDEX IF NOT EXISTS idx_item_posted       ON item(posted_at);

CREATE TABLE IF NOT EXISTS overview_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_overview_at TEXT,
  videos_in_last_overview INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS run (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at  TEXT NOT NULL,
  finished_at TEXT,
  mode        TEXT,                                          -- full|incremental|count
  items       INTEGER NOT NULL DEFAULT 0,
  bytes       INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'running',               -- running|completed|stopped|error
  error       TEXT
);

CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT);
INSERT OR IGNORE INTO schema_meta(key, value) VALUES ('version', '${SCHEMA_VERSION}');
`;
