import { generateUUID, getDB, nowISO, todayStr } from "../LocalDB";

function db() {
  return getDB();
}

export const FoodRepo = {
  async search(query, limit = 15) {
    const rows = await db().getAllAsync(
      `SELECT * FROM food
       WHERE nama_makanan LIKE ? AND deleted_at IS NULL
       ORDER BY is_verified DESC, nama_makanan ASC
       LIMIT ?`,
      [`%${query}%`, limit],
    );
    return rows;
  },

  async getAll() {
    return db().getAllAsync(
      "SELECT * FROM food WHERE deleted_at IS NULL ORDER BY nama_makanan",
    );
  },

  async upsertFromServer(foods = []) {
    const stmt = await db().prepareAsync(
      `INSERT INTO food (server_id, nama_makanan, protein, kalori, karbo, lemak, serat,
        gram_per_porsi, image, is_verified, sync_id, sync_status, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)
       ON CONFLICT(sync_id) DO UPDATE SET
         server_id=excluded.server_id,
         nama_makanan=excluded.nama_makanan, protein=excluded.protein,
         kalori=excluded.kalori, karbo=excluded.karbo, lemak=excluded.lemak,
         serat=excluded.serat, gram_per_porsi=excluded.gram_per_porsi,
         image=excluded.image, is_verified=excluded.is_verified,
         sync_status='synced', updated_at=excluded.updated_at`,
    );
    try {
      for (const f of foods) {
        await stmt.executeAsync([
          f.id,
          f.nama_makanan,
          f.protein,
          f.kalori,
          f.karbo ?? 0,
          f.lemak ?? 0,
          f.serat ?? 0,
          f.gram_per_porsi ?? 100,
          f.image ?? null,
          f.is_verified ? 1 : 0,
          f.sync_id ?? generateUUID(),
          f.updated_at ?? nowISO(),
          f.created_at ?? nowISO(),
        ]);
      }
    } finally {
      await stmt.finalizeAsync();
    }
  },

  async insert(food) {
    const sync_id = generateUUID();
    const now = nowISO();
    const result = await db().runAsync(
      `INSERT INTO food (nama_makanan, protein, kalori, karbo, lemak, serat,
        gram_per_porsi, is_verified, sync_id, sync_status, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?, ?)`,
      [
        food.nama_makanan,
        food.protein,
        food.kalori,
        food.karbo ?? 0,
        food.lemak ?? 0,
        food.serat ?? 0,
        food.gram_per_porsi ?? 100,
        sync_id,
        now,
        now,
      ],
    );
    return { id: result.lastInsertRowId, sync_id };
  },

  async getPending() {
    return db().getAllAsync("SELECT * FROM food WHERE sync_status='pending'");
  },

  async markSynced(syncIds = []) {
    if (!syncIds.length) return;
    const placeholders = syncIds.map(() => "?").join(",");
    await db().runAsync(
      `UPDATE food SET sync_status='synced', updated_at=? WHERE sync_id IN (${placeholders})`,
      [nowISO(), ...syncIds],
    );
  },
};

export const DailyRepo = {
  async getByDate(userId, dateStr = null) {
    const date = dateStr || todayStr();
    const rows = await db().getAllAsync(
      `SELECT wm.*, f.nama_makanan as food_nama, f.protein as food_protein, f.kalori as food_kalori
       FROM waktu_makan wm
       LEFT JOIN food f ON wm.food_id = f.id
       WHERE wm.user_id = ? AND wm.tanggal = ? AND wm.deleted = 0
       ORDER BY wm.created_at ASC`,
      [userId, date],
    );
    const grouped = { Pagi: [], Siang: [], Sore: [], Malam: [] };
    let total_kalori = 0,
      total_protein = 0;

    for (const row of rows) {
      const waktu = row.waktu_makan || "Pagi";
      const item = {
        id: row.id,
        sync_id: row.sync_id,
        sync_status: row.sync_status,
        food: {
          nama_makanan: row.nama_makanan,
          protein: row.protein,
          kalori: row.kalori,
          karbo: row.karbo,
          lemak: row.lemak,
          porsi: row.porsi,
        },
      };
      if (grouped[waktu]) grouped[waktu].push(item);
      total_kalori += row.kalori;
      total_protein += row.protein;
    }

    return { grouped, total_kalori, total_protein };
  },

  async insertBatch(userId, items = []) {
    const stmt = await db().prepareAsync(
      `INSERT INTO waktu_makan
        (user_id, food_id, nama_makanan, protein, kalori, karbo, lemak, porsi,
         waktu_makan, tanggal, catatan, image, sync_id, sync_status, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    );
    const inserted = [];
    try {
      for (const item of items) {
        const sync_id = generateUUID();
        const now = nowISO();
        const result = await stmt.executeAsync([
          userId,
          item.food_id ?? null,
          item.nama_makanan,
          item.protein ?? 0,
          item.kalori ?? 0,
          item.karbo ?? 0,
          item.lemak ?? 0,
          item.porsi ?? 1,
          item.waktu_makan ?? "Pagi",
          item.tanggal ?? todayStr(),
          item.catatan ?? null,
          item.image ?? null,
          sync_id,
          now,
          now,
        ]);
        inserted.push({ id: result.lastInsertRowId, sync_id });
      }
    } finally {
      await stmt.finalizeAsync();
    }
    return inserted;
  },

  async delete(id) {
    await db().runAsync(
      `UPDATE waktu_makan SET deleted=1, sync_status='pending', updated_at=? WHERE id=?`,
      [nowISO(), id],
    );
  },

  async getPending(userId) {
    return db().getAllAsync(
      `SELECT * FROM waktu_makan WHERE user_id=? AND sync_status='pending'`,
      [userId],
    );
  },

  async updateServerIds(acks = []) {
    const stmt = await db().prepareAsync(
      `UPDATE waktu_makan SET server_id=?, sync_status='synced', updated_at=? WHERE sync_id=?`,
    );
    try {
      for (const ack of acks) {
        await stmt.executeAsync([ack.server_id, nowISO(), ack.sync_id]);
      }
    } finally {
      await stmt.finalizeAsync();
    }
  },

  async upsertFromServer(userId, items = []) {
    const stmt = await db().prepareAsync(
      `INSERT INTO waktu_makan
        (server_id, user_id, food_id, nama_makanan, protein, kalori, karbo, lemak,
         porsi, waktu_makan, tanggal, catatan, image, deleted, sync_id, sync_status, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)
       ON CONFLICT(sync_id) DO UPDATE SET
         protein=excluded.protein, kalori=excluded.kalori,
         karbo=excluded.karbo, lemak=excluded.lemak,
         porsi=excluded.porsi, deleted=excluded.deleted,
         server_id=excluded.server_id, sync_status='synced', updated_at=excluded.updated_at
       WHERE excluded.updated_at > waktu_makan.updated_at`,
    );
    try {
      for (const item of items) {
        await stmt.executeAsync([
          item.id,
          userId,
          item.food_id ?? null,
          item.nama_makanan,
          item.protein ?? 0,
          item.kalori ?? 0,
          item.karbo ?? 0,
          item.lemak ?? 0,
          item.porsi ?? 1,
          item.waktu_makan ?? "Pagi",
          item.tanggal ?? todayStr(),
          item.catatan ?? null,
          item.image ?? null,
          item.deleted ? 1 : 0,
          item.sync_id ?? generateUUID(),
          item.updated_at ?? nowISO(),
          item.created_at ?? nowISO(),
        ]);
      }
    } finally {
      await stmt.finalizeAsync();
    }
  },
};

export const WeightRepo = {
  async getHistory(userId, limit = 30) {
    return db().getAllAsync(
      `SELECT * FROM weight_history WHERE user_id=? AND deleted=0
       ORDER BY tanggal DESC LIMIT ?`,
      [userId, limit],
    );
  },

  async upsertToday(userId, berat, catatan = null) {
    const date = todayStr();
    const now = nowISO();
    const sync_id = generateUUID();
    const existing = await db().getFirstAsync(
      "SELECT id FROM weight_history WHERE user_id=? AND tanggal=?",
      [userId, date],
    );

    if (existing) {
      await db().runAsync(
        `UPDATE weight_history SET berat=?, catatan=?, sync_status='pending', updated_at=? WHERE id=?`,
        [berat, catatan, now, existing.id],
      );
      return { id: existing.id, updated: true };
    } else {
      const result = await db().runAsync(
        `INSERT INTO weight_history (user_id, berat, tanggal, catatan, sync_id, sync_status, updated_at, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [userId, berat, date, catatan, sync_id, now, now],
      );
      return { id: result.lastInsertRowId, updated: false };
    }
  },

  async getPending(userId) {
    return db().getAllAsync(
      `SELECT * FROM weight_history WHERE user_id=? AND sync_status='pending'`,
      [userId],
    );
  },

  async upsertFromServer(userId, items = []) {
    const stmt = await db().prepareAsync(
      `INSERT INTO weight_history (server_id, user_id, berat, tanggal, catatan, deleted, sync_id, sync_status, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)
       ON CONFLICT(user_id, tanggal) DO UPDATE SET
         berat=excluded.berat, catatan=excluded.catatan,
         server_id=excluded.server_id, deleted=excluded.deleted,
         sync_status='synced', updated_at=excluded.updated_at
       WHERE excluded.updated_at > weight_history.updated_at`,
    );
    try {
      for (const item of items) {
        await stmt.executeAsync([
          item.id,
          userId,
          item.berat,
          item.tanggal,
          item.catatan ?? null,
          item.deleted ? 1 : 0,
          item.sync_id ?? generateUUID(),
          item.updated_at ?? nowISO(),
          item.created_at ?? nowISO(),
        ]);
      }
    } finally {
      await stmt.finalizeAsync();
    }
  },

  async markSynced(userId) {
    await db().runAsync(
      `UPDATE weight_history SET sync_status='synced' WHERE user_id=? AND sync_status='pending'`,
      [userId],
    );
  },
};

export const WaterRepo = {
  async getTodayTotal(userId) {
    const date = todayStr();
    const row = await db().getFirstAsync(
      `SELECT COALESCE(SUM(jumlah_ml), 0) as total FROM water_log
       WHERE user_id=? AND tanggal=? AND deleted=0`,
      [userId, date],
    );
    return row?.total ?? 0;
  },

  async addEntry(userId, jumlah_ml) {
    const now = nowISO();
    const sync_id = generateUUID();
    const result = await db().runAsync(
      `INSERT INTO water_log (user_id, jumlah_ml, tanggal, sync_id, sync_status, updated_at, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
      [userId, jumlah_ml, todayStr(), sync_id, now, now],
    );
    return { id: result.lastInsertRowId, sync_id };
  },

  async getPending(userId) {
    return db().getAllAsync(
      `SELECT * FROM water_log WHERE user_id=? AND sync_status='pending'`,
      [userId],
    );
  },

  async upsertFromServer(userId, items = []) {
    const stmt = await db().prepareAsync(
      `INSERT INTO water_log (server_id, user_id, jumlah_ml, tanggal, deleted, sync_id, sync_status, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'synced', ?, ?)
       ON CONFLICT(sync_id) DO UPDATE SET
         jumlah_ml=excluded.jumlah_ml, deleted=excluded.deleted,
         server_id=excluded.server_id, sync_status='synced', updated_at=excluded.updated_at
       WHERE excluded.updated_at > water_log.updated_at`,
    );
    try {
      for (const item of items) {
        await stmt.executeAsync([
          item.id,
          userId,
          item.jumlah_ml,
          item.tanggal,
          item.deleted ? 1 : 0,
          item.sync_id ?? generateUUID(),
          item.updated_at ?? nowISO(),
          item.created_at ?? nowISO(),
        ]);
      }
    } finally {
      await stmt.finalizeAsync();
    }
  },

  async markSynced(userId) {
    await db().runAsync(
      `UPDATE water_log SET sync_status='synced' WHERE user_id=? AND sync_status='pending'`,
      [userId],
    );
  },
};

export const LaporanRepo = {
  async getAll(userId, page = 1, limit = 15) {
    const offset = (page - 1) * limit;
    const rows = await db().getAllAsync(
      `SELECT * FROM laporan WHERE user_id=?
       ORDER BY tanggal DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset],
    );
    const count = await db().getFirstAsync(
      "SELECT COUNT(*) as total FROM laporan WHERE user_id=?",
      [userId],
    );
    return {
      laporan: rows,
      total: count?.total ?? 0,
      has_more: count?.total > page * limit,
    };
  },

  async upsertFromServer(userId, items = []) {
    const stmt = await db().prepareAsync(
      `INSERT INTO laporan (server_id, user_id, tanggal, total_protein, total_kalori, total_karbo, total_lemak, sync_id, sync_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)
       ON CONFLICT(sync_id) DO UPDATE SET
         total_protein=excluded.total_protein, total_kalori=excluded.total_kalori,
         total_karbo=excluded.total_karbo, total_lemak=excluded.total_lemak,
         server_id=excluded.server_id, sync_status='synced'`,
    );
    try {
      for (const item of items) {
        await stmt.executeAsync([
          item.id,
          userId,
          item.tanggal,
          item.total_protein ?? 0,
          item.total_kalori ?? 0,
          item.total_karbo ?? 0,
          item.total_lemak ?? 0,
          item.sync_id ?? generateUUID(),
          item.created_at ?? nowISO(),
        ]);
      }
    } finally {
      await stmt.finalizeAsync();
    }
  },
};

export const UserRepo = {
  async get(userId) {
    return db().getFirstAsync("SELECT * FROM users WHERE id=?", [userId]);
  },

  async upsert(user) {
    const now = nowISO();
    await db().runAsync(
      `INSERT INTO users (id, username, bb, tb, umur, gender, aktivitas, tujuan,
        tipe_tubuh, bmr, tdee, bmi, foto_url, sync_id, sync_status, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         username=excluded.username, bb=excluded.bb, tb=excluded.tb,
         umur=excluded.umur, gender=excluded.gender, aktivitas=excluded.aktivitas,
         tujuan=excluded.tujuan, tipe_tubuh=excluded.tipe_tubuh,
         bmr=excluded.bmr, tdee=excluded.tdee, bmi=excluded.bmi,
         foto_url=excluded.foto_url, sync_status='synced', updated_at=excluded.updated_at`,
      [
        user.id,
        user.username,
        user.bb,
        user.tb,
        user.umur,
        user.gender,
        user.aktivitas,
        user.tujuan,
        user.tipe_tubuh,
        user.bmr,
        user.tdee,
        user.bmi,
        user.foto_url ?? null,
        user.sync_id ?? generateUUID(),
        now,
        now,
      ],
    );
  },
};
