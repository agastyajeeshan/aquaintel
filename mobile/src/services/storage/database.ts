import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { FarmOverview, PondSummary, AlertItem } from '../../types';

let dbInstance: any = null;

// Initialize database schema
export async function getDatabase(): Promise<any> {
  if (Platform.OS === 'web') {
    return null; // Local storage in-memory for web
  }
  if (!dbInstance) {
    try {
      dbInstance = await SQLite.openDatabaseAsync('aquaintel_mobile.db');
      await initTables(dbInstance);
    } catch (e) {
      console.warn('SQLite openDatabaseAsync error:', e);
      return null;
    }
  }
  return dbInstance;
}

async function initTables(db: any) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS cached_farm_overview (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cached_ponds (
      id INTEGER PRIMARY KEY,
      pond_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cached_alerts (
      id INTEGER PRIMARY KEY,
      pond_id INTEGER,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);
}

export const offlineDatabase = {
  async saveFarmOverview(overview: FarmOverview): Promise<void> {
    try {
      const db = await getDatabase();
      if (!db) return;
      const now = new Date().toISOString();
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_farm_overview (id, data_json, updated_at) VALUES (1, ?, ?)`,
        [JSON.stringify(overview), now]
      );
    } catch (e) {
      console.warn('Error caching farm overview:', e);
    }
  },

  async getCachedFarmOverview(): Promise<{ data: FarmOverview; updatedAt: string } | null> {
    try {
      const db = await getDatabase();
      if (!db) return null;
      const row = await db.getFirstAsync(
        `SELECT data_json, updated_at FROM cached_farm_overview WHERE id = 1`
      );
      if (!row) return null;
      return {
        data: JSON.parse(row.data_json),
        updatedAt: row.updated_at,
      };
    } catch (e) {
      console.warn('Error reading cached farm overview:', e);
      return null;
    }
  },

  async savePonds(ponds: PondSummary[]): Promise<void> {
    try {
      const db = await getDatabase();
      if (!db) return;
      const now = new Date().toISOString();
      for (const p of ponds) {
        await db.runAsync(
          `INSERT OR REPLACE INTO cached_ponds (id, pond_number, name, status, data_json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [p.id, p.pond_number, p.name, p.status, JSON.stringify(p), now]
        );
      }
    } catch (e) {
      console.warn('Error caching ponds:', e);
    }
  },

  async getCachedPonds(): Promise<{ data: PondSummary[]; updatedAt: string } | null> {
    try {
      const db = await getDatabase();
      if (!db) return null;
      const rows = await db.getAllAsync(`SELECT data_json, updated_at FROM cached_ponds ORDER BY pond_number ASC`);
      if (!rows || rows.length === 0) return null;
      return {
        data: rows.map((r: any) => JSON.parse(r.data_json)),
        updatedAt: rows[0].updated_at,
      };
    } catch (e) {
      console.warn('Error reading cached ponds:', e);
      return null;
    }
  },

  async saveAlerts(alerts: AlertItem[]): Promise<void> {
    try {
      const db = await getDatabase();
      if (!db) return;
      const now = new Date().toISOString();
      for (const a of alerts) {
        await db.runAsync(
          `INSERT OR REPLACE INTO cached_alerts (id, pond_id, severity, status, data_json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [a.id, a.pond_id ?? null, a.severity, a.status, JSON.stringify(a), now]
        );
      }
    } catch (e) {
      console.warn('Error caching alerts:', e);
    }
  },

  async getCachedAlerts(): Promise<AlertItem[]> {
    try {
      const db = await getDatabase();
      if (!db) return [];
      const rows = await db.getAllAsync(`SELECT data_json FROM cached_alerts ORDER BY id DESC LIMIT 50`);
      if (!rows) return [];
      return rows.map((r: any) => JSON.parse(r.data_json));
    } catch (e) {
      console.warn('Error reading cached alerts:', e);
      return [];
    }
  },

  async clearAllCache(): Promise<void> {
    try {
      const db = await getDatabase();
      if (!db) return;
      await db.execAsync(`
        DELETE FROM cached_farm_overview;
        DELETE FROM cached_ponds;
        DELETE FROM cached_alerts;
      `);
    } catch (e) {
      console.warn('Error clearing offline cache:', e);
    }
  },
};
