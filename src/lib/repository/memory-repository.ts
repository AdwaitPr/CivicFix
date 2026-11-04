import { SqliteAdapter } from "../db/sqlite-adapter";
import { initSqliteSchema } from "../db/sqlite-init";
import { SqliteCivicFixRepository } from "./sqlite-repository";

/**
 * High-speed In-Memory CivicFix Repository using sql.js WebAssembly for unit tests.
 */
export class MemoryCivicFixRepository extends SqliteCivicFixRepository {
  static async create(): Promise<MemoryCivicFixRepository> {
    const adapter = await SqliteAdapter.create();
    initSqliteSchema(adapter, true);
    return new MemoryCivicFixRepository(adapter);
  }
}
