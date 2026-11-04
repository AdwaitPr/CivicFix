import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";

export class SqliteAdapter {
  constructor(private db: Database, private filePath?: string) {}

  static async create(filePath?: string): Promise<SqliteAdapter> {
    const SQL = await initSqlJs();
    let db: Database;
    if (filePath && fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
    return new SqliteAdapter(db, filePath);
  }

  exec(sql: string) {
    this.db.exec(sql);
    this.persist();
  }

  run(sql: string, params: any[] = []): { changes: number } {
    this.db.run(sql, params);
    this.persist();
    return { changes: this.db.getRowsModified() };
  }

  get<T = any>(sql: string, params: any[] = []): T | null {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject() as T;
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  all<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  }

  private persist() {
    if (this.filePath) {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = this.db.export();
      fs.writeFileSync(this.filePath, Buffer.from(data));
    }
  }

  close() {
    this.persist();
    this.db.close();
  }
}
