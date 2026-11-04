import path from "path";
import fs from "fs";
import type { ICivicFixRepository } from "./civicfix-repository.interface";
import { SqliteCivicFixRepository } from "./sqlite-repository";
import { SupabaseCivicFixRepository } from "./supabase-repository";
import { SqliteAdapter } from "../db/sqlite-adapter";
import { initSqliteSchema } from "../db/sqlite-init";

let repoInstance: ICivicFixRepository | null = null;

export async function getCivicFixRepository(): Promise<ICivicFixRepository> {
  if (repoInstance) return repoInstance;

  const mode = process.env.CIVICFIX_DATA_MODE || "local";

  if (mode === "supabase") {
    repoInstance = new SupabaseCivicFixRepository();
    return repoInstance;
  }

  // Local SQLite Mode via WebAssembly sql.js
  const dbPath = process.env.SQLITE_DB_PATH || "./data/civicfix.sqlite";
  const resolvedPath = path.resolve(process.cwd(), dbPath);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const adapter = await SqliteAdapter.create(resolvedPath);
  initSqliteSchema(adapter, true);
  repoInstance = new SqliteCivicFixRepository(adapter);

  return repoInstance;
}
