import * as SQLite from "expo-sqlite";

export const SYNC_STATUS = {
  SYNCED: "synced",
  PENDING: "pending",
  CONFLICT: "conflict",
};
let _db = null;
export function getDB() {
  if (!_db) _db = SQLite.openDatabaseSync("nutriai_local.db");
  return _db;
}
const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    username      TEXT    NOT NULL DEFAULT '',
    bb            REAL    NOT NULL DEFAULT 0,
    tb            REAL    NOT NULL DEFAULT 0,
    umur          INTEGER NOT NULL DEFAULT 0,
    gender        TEXT    NOT NULL DEFAULT '',
    aktivitas     TEXT    NOT NULL DEFAULT '',
    tujuan        TEXT    NOT NULL DEFAULT 'maintain',
    tipe_tubuh    TEXT    NOT NULL DEFAULT 'mesomorph',
    bmr           REAL    DEFAULT 0,
    tdee          REAL    DEFAULT 0,
    bmi           REAL    DEFAULT 0,
    foto_url      TEXT,
    sync_id       TEXT    NOT NULL DEFAULT '',
    sync_status   TEXT    NOT NULL DEFAULT 'synced',
    updated_at    TEXT    NOT NULL DEFAULT '',
    created_at    TEXT    NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS food (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id       INTEGER,
    nama_makanan    TEXT    NOT NULL DEFAULT '',
    protein         REAL    NOT NULL DEFAULT 0,
    kalori          REAL    NOT NULL DEFAULT 0,
    karbo           REAL    NOT NULL DEFAULT 0,
    lemak           REAL    NOT NULL DEFAULT 0,
    serat           REAL    NOT NULL DEFAULT 0,
    gram_per_porsi  REAL    NOT NULL DEFAULT 100,
    image           TEXT,
    is_verified     INTEGER NOT NULL DEFAULT 0,
    sync_id         TEXT    NOT NULL DEFAULT '',
    sync_status     TEXT    NOT NULL DEFAULT 'synced',
    updated_at      TEXT    NOT NULL DEFAULT '',
    created_at      TEXT    NOT NULL DEFAULT ''
  )`,

  `CREATE INDEX IF NOT EXISTS idx_food_nama      ON food(nama_makanan)`,
  `CREATE INDEX IF NOT EXISTS idx_food_server_id ON food(server_id)`,
  `CREATE TABLE IF NOT EXISTS waktu_makan (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id     INTEGER,
    user_id       INTEGER NOT NULL DEFAULT 0,
    food_id       INTEGER,
    nama_makanan  TEXT    NOT NULL DEFAULT '',
    protein       REAL    NOT NULL DEFAULT 0,
    kalori        REAL    NOT NULL DEFAULT 0,
    karbo         REAL    NOT NULL DEFAULT 0,
    lemak         REAL    NOT NULL DEFAULT 0,
    porsi         INTEGER NOT NULL DEFAULT 1,
    waktu_makan   TEXT    NOT NULL DEFAULT 'Pagi',
    tanggal       TEXT    NOT NULL DEFAULT '',
    catatan       TEXT,
    image         TEXT,
    deleted       INTEGER NOT NULL DEFAULT 0,
    sync_id       TEXT    NOT NULL DEFAULT '',
    sync_status   TEXT    NOT NULL DEFAULT 'pending',
    updated_at    TEXT    NOT NULL DEFAULT '',
    created_at    TEXT    NOT NULL DEFAULT ''
  )`,

  `CREATE INDEX IF NOT EXISTS idx_wm_user_date  ON waktu_makan(user_id, tanggal)`,
  `CREATE INDEX IF NOT EXISTS idx_wm_pending    ON waktu_makan(sync_status)`,
  `CREATE TABLE IF NOT EXISTS weight_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id   INTEGER,
    user_id     INTEGER NOT NULL DEFAULT 0,
    berat       REAL    NOT NULL DEFAULT 0,
    tanggal     TEXT    NOT NULL DEFAULT '',
    catatan     TEXT,
    deleted     INTEGER NOT NULL DEFAULT 0,
    sync_id     TEXT    NOT NULL DEFAULT '',
    sync_status TEXT    NOT NULL DEFAULT 'pending',
    updated_at  TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT ''
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_user_date ON weight_history(user_id, tanggal)`,
  `CREATE TABLE IF NOT EXISTS water_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id   INTEGER,
    user_id     INTEGER NOT NULL DEFAULT 0,
    jumlah_ml   INTEGER NOT NULL DEFAULT 0,
    tanggal     TEXT    NOT NULL DEFAULT '',
    deleted     INTEGER NOT NULL DEFAULT 0,
    sync_id     TEXT    NOT NULL DEFAULT '',
    sync_status TEXT    NOT NULL DEFAULT 'pending',
    updated_at  TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT ''
  )`,

  `CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_log(user_id, tanggal)`,
  `CREATE TABLE IF NOT EXISTS laporan (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id      INTEGER,
    user_id        INTEGER NOT NULL DEFAULT 0,
    tanggal        TEXT    NOT NULL DEFAULT '',
    total_protein  REAL    NOT NULL DEFAULT 0,
    total_kalori   REAL    NOT NULL DEFAULT 0,
    total_karbo    REAL    NOT NULL DEFAULT 0,
    total_lemak    REAL    NOT NULL DEFAULT 0,
    sync_id        TEXT    NOT NULL DEFAULT '',
    sync_status    TEXT    NOT NULL DEFAULT 'synced',
    created_at     TEXT    NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS sync_meta (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS sync_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    triggered_by TEXT NOT NULL DEFAULT 'manual',
    status       TEXT NOT NULL DEFAULT 'success',
    pushed       INTEGER NOT NULL DEFAULT 0,
    pulled       INTEGER NOT NULL DEFAULT 0,
    conflicts    INTEGER NOT NULL DEFAULT 0,
    error_msg    TEXT,
    duration_ms  INTEGER,
    created_at   TEXT NOT NULL DEFAULT ''
  )`,
];

const MIGRATIONS = [
  `UPDATE waktu_makan SET sync_id = 'local_' || CAST(id AS TEXT) WHERE sync_id IS NULL OR sync_id = ''`,
  `UPDATE food        SET sync_id = 'local_' || CAST(id AS TEXT) WHERE sync_id IS NULL OR sync_id = ''`,
  `UPDATE laporan     SET sync_id = 'local_' || CAST(id AS TEXT) WHERE sync_id IS NULL OR sync_id = ''`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_wm_sync_id     ON waktu_makan(sync_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_food_sync_id   ON food(sync_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_laporan_sync_id ON laporan(sync_id)`,
];

let _initialized = false;

export async function initLocalDB() {
  if (_initialized) return;

  const db = getDB();

  try {
    for (const sql of TABLES) {
      await db.runAsync(sql);
    }
    for (const sql of MIGRATIONS) {
      try {
        await db.runAsync(sql);
      } catch (e) {
        if (!e?.message?.includes("already exists")) {
          console.warn("[LocalDB] Migration warning:", e?.message);
        }
      }
    }
    _initialized = true;
    console.log("[LocalDB] ✓ Initialized — semua tabel siap");
  } catch (e) {
    console.error("[LocalDB] Init error:", e);
    throw e;
  }
}

export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function nowISO() {
  return new Date().toISOString();
}
export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export async function getMeta(key) {
  try {
    const db = getDB();
    const row = await db.getFirstAsync(
      "SELECT value FROM sync_meta WHERE key = ?",
      [key],
    );
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setMeta(key, value) {
  try {
    const db = getDB();
    await db.runAsync(
      `INSERT INTO sync_meta(key, value, updated_at)
       VALUES(?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
      [key, String(value), nowISO()],
    );
  } catch (e) {
    console.warn("[LocalDB] setMeta error:", e);
  }
}

export const META_KEYS = {
  LAST_SYNC_AT: "last_sync_at",
  USER_ID: "user_id",
  SYNC_HOUR: "scheduled_sync_hour",
};
