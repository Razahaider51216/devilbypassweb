import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { isPostgresConfigured, postgresDatabase } from "./postgres-database.server";

type Row = Record<string, unknown>;
// The compatibility query builder intentionally returns rows with runtime-defined shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Result = { data: any; error: { message: string } | null; count?: number | null };

const tableMeta = {
  users: { key: "id", booleans: [], json: [] },
  profiles: { key: "id", booleans: ["is_banned", "bypass_disabled"], json: [] },
  user_roles: { key: "id", booleans: [], json: [] },
  plans: {
    key: "code",
    booleans: ["is_active", "is_trial", "is_featured"],
    json: ["features_en", "features_th"],
  },
  purchase_requests: { key: "id", booleans: [], json: [] },
  bypass_logs: { key: "id", booleans: [], json: [] },
  site_settings: { key: "key", booleans: [], json: [] },
  contact_channels: { key: "id", booleans: ["is_active"], json: [] },
  purchase_contact_links: { key: "id", booleans: ["is_active"], json: [] },
  announcements: { key: "id", booleans: ["is_active"], json: [] },
  changelog_entries: {
    key: "id",
    booleans: ["is_published", "is_important"],
    json: [],
  },
  supported_sites: { key: "id", booleans: ["is_visible"], json: [] },
} as const;

type TableName = keyof typeof tableMeta;

let sqlite: DatabaseSync | undefined;

function now() {
  return new Date().toISOString();
}

function dataDirectory() {
  return resolve(process.env["DATA_DIR"] || "./data");
}

export function getDataDirectory() {
  const directory = dataDirectory();
  mkdirSync(directory, { recursive: true });
  return directory;
}

export function getSqlite(): DatabaseSync {
  if (sqlite) return sqlite;

  const directory = getDataDirectory();
  sqlite = new DatabaseSync(resolve(directory, "devildev.sqlite"));
  sqlite.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  migrate(sqlite);
  seed(sqlite);
  return sqlite;
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      reset_code_hash TEXT,
      reset_expires_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      email TEXT,
      plan_code TEXT NOT NULL DEFAULT 'free',
      plan_expires_at TEXT,
      used_today INTEGER NOT NULL DEFAULT 0,
      usage_date TEXT NOT NULL,
      total_used INTEGER NOT NULL DEFAULT 0,
      is_banned INTEGER NOT NULL DEFAULT 0,
      bypass_disabled INTEGER NOT NULL DEFAULT 0,
      trial_claimed_at TEXT,
      admin_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
      created_at TEXT NOT NULL,
      UNIQUE(user_id, role)
    );
    CREATE TABLE IF NOT EXISTS plans (
      code TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_th TEXT NOT NULL,
      description_en TEXT NOT NULL DEFAULT '',
      description_th TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'THB',
      daily_limit INTEGER,
      features_en TEXT NOT NULL DEFAULT '[]',
      features_th TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      duration_days INTEGER,
      is_trial INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS purchase_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_code TEXT NOT NULL,
      contact TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      admin_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bypass_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      status TEXT NOT NULL,
      result TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS bypass_logs_user_created_idx ON bypass_logs(user_id, created_at);
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contact_channels (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      url TEXT NOT NULL,
      handle TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL DEFAULT 'discord',
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS purchase_contact_links (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL DEFAULT 'Discord',
      url TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title_en TEXT NOT NULL DEFAULT '',
      title_th TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '',
      body_th TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      link_url TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS changelog_entries (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL DEFAULT '',
      title_th TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '',
      body_th TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL DEFAULT 'new',
      released_at TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 1,
      is_important INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS supported_sites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain_or_pattern TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'available',
      category TEXT NOT NULL DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0,
      is_visible INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT,
      updated_by TEXT
    );
  `);

  // Columns added after the first self-hosted release. Keep these migrations
  // additive so existing SQLite installations retain their accounts and plans.
  const profileColumns = new Set(
    (db.prepare("PRAGMA table_info(profiles)").all() as Array<{ name: string }>).map(
      (column) => column.name,
    ),
  );
  if (!profileColumns.has("display_name"))
    db.exec("ALTER TABLE profiles ADD COLUMN display_name TEXT");
  if (!profileColumns.has("avatar_url")) db.exec("ALTER TABLE profiles ADD COLUMN avatar_url TEXT");
  if (!profileColumns.has("discord_username"))
    db.exec("ALTER TABLE profiles ADD COLUMN discord_username TEXT");

  const userColumns = new Set(
    (db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>).map(
      (column) => column.name,
    ),
  );
  if (!userColumns.has("discord_id")) db.exec("ALTER TABLE users ADD COLUMN discord_id TEXT");
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS users_discord_id_idx ON users(discord_id) WHERE discord_id IS NOT NULL",
  );

  const schemaVersion = db.prepare("PRAGMA user_version").get() as { user_version: number };
  if (schemaVersion.user_version < 1) {
    db.exec("UPDATE supported_sites SET status='available' WHERE status='maintenance'");
    db.exec("PRAGMA user_version = 1");
  }
}

function seed(db: DatabaseSync) {
  const stamp = now();
  const plans = [
    [
      "free",
      "Free",
      "ฟรี",
      "5 link bypasses per day.",
      "บายพาสได้วันละ 5 ลิงก์",
      0,
      5,
      ["5 bypasses per day", "Community support"],
      ["บายพาสวันละ 5 ลิงก์", "ซัพพอร์ตผ่านชุมชน"],
      1,
      null,
      0,
      0,
    ],
    [
      "trial",
      "Free Trial 7 days",
      "ทดลองใช้ฟรี 7 วัน",
      "Full Pro access for 7 days.",
      "ใช้งานระดับ Pro ฟรี 7 วัน",
      0,
      null,
      ["Unlimited for 7 days", "No payment required"],
      ["ไม่จำกัด 7 วัน", "ไม่ต้องชำระเงิน"],
      1,
      7,
      1,
      1,
    ],
    [
      "pro",
      "Pro",
      "โปร",
      "Unlimited bypasses and full history.",
      "บายพาสไม่จำกัดและเก็บประวัติเต็มรูปแบบ",
      129,
      null,
      ["Unlimited bypasses", "Priority queue", "Full history"],
      ["บายพาสไม่จำกัด", "คิวพิเศษ", "ประวัติเต็มรูปแบบ"],
      2,
      30,
      0,
      0,
    ],
  ] as const;
  const planInsert = db.prepare(`INSERT OR IGNORE INTO plans
    (code,name_en,name_th,description_en,description_th,price,currency,daily_limit,features_en,features_th,is_active,sort_order,duration_days,is_trial,is_featured,created_at,updated_at)
    VALUES (?,?,?,?,?,?,'THB',?,?,?,?,?,?,?,?,?,?)`);
  for (const p of plans) {
    planInsert.run(
      p[0],
      p[1],
      p[2],
      p[3],
      p[4],
      p[5],
      p[6],
      JSON.stringify(p[7]),
      JSON.stringify(p[8]),
      1,
      p[9],
      p[10],
      p[11],
      p[12],
      stamp,
      stamp,
    );
  }

  db.prepare(
    "INSERT OR IGNORE INTO site_settings(key,value,updated_at) VALUES ('discord_url','https://discord.gg/devildev',?)",
  ).run(stamp);
  db.prepare(
    "INSERT OR IGNORE INTO site_settings(key,value,updated_at) VALUES ('discord_tag','devildev',?)",
  ).run(stamp);
  db.prepare(
    `INSERT INTO contact_channels
    (id,label,url,handle,kind,is_active,sort_order,created_at,updated_at)
    SELECT ?,?,?,?,?,1,0,?,?
    WHERE NOT EXISTS (SELECT 1 FROM contact_channels WHERE kind=? AND url=?)`,
  ).run(
    randomUUID(),
    "Discord",
    "https://discord.gg/devildev",
    "devildev",
    "discord",
    stamp,
    stamp,
    "discord",
    "https://discord.gg/devildev",
  );
  db.prepare(
    `INSERT OR IGNORE INTO purchase_contact_links
    (id,kind,label,url,is_active,sort_order,created_at,updated_at)
    VALUES (?,'discord','Discord','',0,0,?,?)`,
  ).run(randomUUID(), stamp, stamp);

  const sites = [
    ["Key Delta", "keydelta"],
    ["linkzy.space", "linkzy.space"],
    ["stfly.vip", "stfly.vip"],
    ["shrtslug.biz", "shrtslug.biz"],
    ["Roblox Scripts", "robloxscripts.gg/social"],
    ["rinku / Fly.inc", "rinku"],
    ["Pandadevelopment", "pandadevelopment.net"],
    ["sfl.gl", "sfl.gl"],
    ["Work.ink", "work.ink"],
    ["go.yorurl.com", "go.yorurl.com"],
    ["Violated.lol", "violated.lol"],
    ["link2unlock.com", "link2unlock.com"],
    ["blox-script.com", "blox-script.com/get-key"],
    ["Linkvertise", "linkvertise.com"],
    ["Platoboost", "auth.platoboost.app"],
    ["lockr.to", "lockr.to"],
    ["Subnise", "subnise"],
    ["loot-reward.com", "loot-reward.com"],
    ["sub2unlock.io", "sub2unlock.io"],
    ["trigonevo", "trigonevo"],
    ["new.pandadevelopment.net", "new.pandadevelopment.net"],
    ["tpi.li", "tpi.li"],
    ["JNHH Key System", "jnhh-keysystem.vercel.app"],
    ["hxrazu.com", "hxrazu.com"],
    ["somtank.wisp.uno", "somtank.wisp.uno"],
    ["scriptedhub.blogspot.com", "scriptedhub.blogspot.com"],
  ];
  const siteInsert = db.prepare(`INSERT OR IGNORE INTO supported_sites
    (id,name,domain_or_pattern,status,display_order,is_visible,created_at,updated_at)
    VALUES (?,?,?,'available',?,1,?,?)`);
  sites.forEach(([name, domain], index) =>
    siteInsert.run(randomUUID(), name!, domain!, (index + 1) * 10, stamp, stamp),
  );

  db.prepare(
    `INSERT INTO announcements
    (id,title_en,title_th,body_en,body_th,is_active,sort_order,created_at,updated_at)
    SELECT ?,'Welcome to DevilDev','ยินดีต้อนรับสู่ DevilDev','The self-hosted service is ready.','ระบบแบบ self-hosted พร้อมใช้งานแล้ว',1,0,?,?
    WHERE NOT EXISTS (SELECT 1 FROM announcements)`,
  ).run(randomUUID(), stamp, stamp);
  db.prepare(
    `INSERT INTO changelog_entries
    (id,version,title_en,title_th,body_en,body_th,kind,released_at,is_published,is_important,sort_order,created_at,updated_at)
    SELECT ?,'v2.0.0','Self-hosted backend','ระบบหลังบ้านแบบ self-hosted','Moved database, authentication and uploads to local infrastructure.','ย้ายฐานข้อมูล ระบบสมาชิก และไฟล์อัปโหลดมาไว้ในระบบของตนเอง','improve',?,1,1,0,?,?
    WHERE NOT EXISTS (SELECT 1 FROM changelog_entries)`,
  ).run(randomUUID(), stamp, stamp, stamp);
}

function assertName(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) throw new Error(`Invalid database identifier: ${value}`);
  return value;
}

function encode(table: TableName, key: string, value: unknown): SQLInputValue {
  const meta = tableMeta[table];
  if ((meta.booleans as readonly string[]).includes(key)) return value ? 1 : 0;
  if ((meta.json as readonly string[]).includes(key)) return JSON.stringify(value ?? []);
  if (value === undefined) return null;
  return value as SQLInputValue;
}

function decode(table: TableName, row: Row): Row {
  const meta = tableMeta[table];
  for (const key of meta.booleans as readonly string[]) {
    if (key in row) row[key] = Boolean(row[key]);
  }
  for (const key of meta.json as readonly string[]) {
    if (typeof row[key] === "string") {
      try {
        row[key] = JSON.parse(row[key] as string);
      } catch {
        row[key] = [];
      }
    }
  }
  return row;
}

type Filter = { sql: string; values: SQLInputValue[] };

class QueryBuilder implements PromiseLike<Result> {
  private operation: "select" | "insert" | "update" | "delete" = "select";
  private selected = "*";
  private returning: string | null = null;
  private payload: Row | Row[] | null = null;
  private filters: Filter[] = [];
  private orders: string[] = [];
  private maxRows: number | null = null;
  private one = false;
  private head = false;
  private wantsCount = false;
  private conflict: string[] | null = null;

  constructor(private table: TableName) {}

  select(columns = "*", options?: { count?: string; head?: boolean }) {
    const safe =
      columns === "*"
        ? "*"
        : columns
            .split(",")
            .map((c) => assertName(c.trim()))
            .join(", ");
    if (this.operation === "insert" || this.operation === "update") this.returning = safe;
    else {
      this.operation = "select";
      this.selected = safe;
    }
    this.head = options?.head === true;
    this.wantsCount = options?.count === "exact";
    return this;
  }

  insert(value: Row | Row[]) {
    this.operation = "insert";
    this.payload = value;
    return this;
  }
  update(value: Row) {
    this.operation = "update";
    this.payload = value;
    return this;
  }
  upsert(value: Row | Row[], options?: { onConflict?: string }) {
    this.operation = "insert";
    this.payload = value;
    this.conflict = options?.onConflict?.split(",").map((v) => assertName(v.trim())) ?? [
      tableMeta[this.table].key,
    ];
    return this;
  }
  delete() {
    this.operation = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    return this.where(column, "=", value);
  }
  neq(column: string, value: unknown) {
    return this.where(column, "!=", value);
  }
  gte(column: string, value: unknown) {
    return this.where(column, ">=", value);
  }
  is(column: string, value: unknown) {
    assertName(column);
    this.filters.push({
      sql: `${column} IS ${value === null ? "NULL" : "?"}`,
      values: value === null ? [] : [encode(this.table, column, value)],
    });
    return this;
  }
  in(column: string, values: unknown[]) {
    assertName(column);
    if (!values.length) this.filters.push({ sql: "0 = 1", values: [] });
    else
      this.filters.push({
        sql: `${column} IN (${values.map(() => "?").join(",")})`,
        values: values.map((v) => encode(this.table, column, v)),
      });
    return this;
  }
  or(expression: string) {
    const clauses = expression.split(",").map((part) => {
      const match = part.match(/^([a-z_][a-z0-9_]*)\.ilike\.(.*)$/i);
      if (!match) throw new Error("Unsupported OR filter");
      return { sql: `LOWER(${assertName(match[1]!)}) LIKE LOWER(?)`, value: match[2]! };
    });
    this.filters.push({
      sql: `(${clauses.map((c) => c.sql).join(" OR ")})`,
      values: clauses.map((c) => c.value),
    });
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push(`${assertName(column)} ${options?.ascending === false ? "DESC" : "ASC"}`);
    return this;
  }
  limit(value: number) {
    this.maxRows = Math.max(0, Math.floor(value));
    return this;
  }
  maybeSingle() {
    this.one = true;
    this.maxRows = 1;
    return this;
  }
  single() {
    this.one = true;
    this.maxRows = 1;
    return this;
  }

  private where(column: string, operator: string, value: unknown) {
    assertName(column);
    this.filters.push({
      sql: `${column} ${operator} ?`,
      values: [encode(this.table, column, value)],
    });
    return this;
  }

  private whereSql() {
    return this.filters.length ? ` WHERE ${this.filters.map((f) => f.sql).join(" AND ")}` : "";
  }
  private values() {
    return this.filters.flatMap((f) => f.values);
  }

  private prepareRows(): Row[] {
    const values = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
    return values.map((original) => {
      const row = { ...original };
      const meta = tableMeta[this.table];
      if (meta.key === "id" && !row["id"]) row["id"] = randomUUID();
      if (!row["created_at"]) row["created_at"] = now();
      if (
        this.table !== "bypass_logs" &&
        !row["updated_at"] &&
        !["users", "user_roles"].includes(this.table)
      )
        row["updated_at"] = now();
      return row;
    });
  }

  private execute(): Result {
    try {
      const db = getSqlite();
      if (this.operation === "select") {
        if (this.wantsCount) {
          const row = db
            .prepare(`SELECT COUNT(*) AS total FROM ${this.table}${this.whereSql()}`)
            .get(...this.values()) as Row;
          return { data: this.head ? null : [], error: null, count: Number(row["total"] ?? 0) };
        }
        const order = this.orders.length ? ` ORDER BY ${this.orders.join(", ")}` : "";
        const limit = this.maxRows !== null ? ` LIMIT ${this.maxRows}` : "";
        const rows = db
          .prepare(`SELECT ${this.selected} FROM ${this.table}${this.whereSql()}${order}${limit}`)
          .all(...this.values())
          .map((r) => decode(this.table, r as Row));
        return { data: this.one ? (rows[0] ?? null) : rows, error: null };
      }

      if (this.operation === "insert") {
        const rows = this.prepareRows();
        const returned: Row[] = [];
        db.exec("BEGIN IMMEDIATE");
        try {
          for (const row of rows) {
            const columns = Object.keys(row).map(assertName);
            const placeholders = columns.map(() => "?").join(",");
            const conflictColumns = this.conflict ?? [];
            const conflict = conflictColumns.length
              ? ` ON CONFLICT(${conflictColumns.join(",")}) DO UPDATE SET ${columns
                  .filter((c) => !conflictColumns.includes(c))
                  .map((c) => `${c}=excluded.${c}`)
                  .join(",")}`
              : "";
            const returning = this.returning ? ` RETURNING ${this.returning}` : "";
            const result = db
              .prepare(
                `INSERT INTO ${this.table} (${columns.join(",")}) VALUES (${placeholders})${conflict}${returning}`,
              )
              .get(...columns.map((c) => encode(this.table, c, row[c])));
            if (result) returned.push(decode(this.table, result as Row));
          }
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
        return {
          data: this.one ? (returned[0] ?? null) : this.returning ? returned : null,
          error: null,
        };
      }

      if (this.operation === "update") {
        const row = this.payload as Row;
        const columns = Object.keys(row).map(assertName);
        if (!columns.length) return { data: null, error: null };
        const returning = this.returning ? ` RETURNING ${this.returning}` : "";
        const values = [...columns.map((c) => encode(this.table, c, row[c])), ...this.values()];
        const statement = db.prepare(
          `UPDATE ${this.table} SET ${columns.map((c) => `${c}=?`).join(",")}${this.whereSql()}${returning}`,
        );
        const rows = this.returning
          ? statement.all(...values).map((r) => decode(this.table, r as Row))
          : (statement.run(...values), []);
        return { data: this.one ? (rows[0] ?? null) : this.returning ? rows : null, error: null };
      }

      getSqlite()
        .prepare(`DELETE FROM ${this.table}${this.whereSql()}`)
        .run(...this.values());
      return { data: null, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : String(error) },
        count: null,
      };
    }
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

function rpc(name: string, args: Row): Result {
  try {
    const db = getSqlite();
    if (name === "has_role") {
      const row = db
        .prepare("SELECT 1 FROM user_roles WHERE user_id=? AND role=?")
        .get(args["_user_id"] as string, args["_role"] as string);
      return { data: Boolean(row), error: null };
    }
    if (name === "reserve_bypass_slot")
      return reserveBypass(db, String(args["_user_id"] ?? ""), String(args["_url"] ?? ""));
    if (name === "finish_bypass_slot") return finishBypass(db, args);
    throw new Error(`Unknown database function: ${name}`);
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : String(error) },
    };
  }
}

function reserveBypass(db: DatabaseSync, userId: string, url: string): Result {
  db.exec("BEGIN IMMEDIATE");
  try {
    const profile = db.prepare("SELECT * FROM profiles WHERE id=?").get(userId) as Row | undefined;
    if (!profile) {
      db.exec("ROLLBACK");
      return { data: { ok: false, code: "not_signed_in" }, error: null };
    }
    if (profile["is_banned"]) {
      db.exec("ROLLBACK");
      return { data: { ok: false, code: "banned" }, error: null };
    }
    if (profile["bypass_disabled"]) {
      db.exec("ROLLBACK");
      return { data: { ok: false, code: "bypass_disabled" }, error: null };
    }
    let planCode = String(profile["plan_code"]);
    if (profile["plan_expires_at"] && String(profile["plan_expires_at"]) < now()) {
      planCode = "free";
      db.prepare("UPDATE profiles SET plan_code='free', plan_expires_at=NULL WHERE id=?").run(
        userId,
      );
    }
    let plan = db
      .prepare("SELECT daily_limit FROM plans WHERE code=? AND is_active=1")
      .get(planCode) as Row | undefined;
    if (!plan) {
      planCode = "free";
      db.prepare("UPDATE profiles SET plan_code='free', plan_expires_at=NULL WHERE id=?").run(
        userId,
      );
      plan = db.prepare("SELECT daily_limit FROM plans WHERE code='free'").get() as Row;
    }
    const bangkokDay = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "Asia/Bangkok",
    }).format(new Date());
    if (planCode === "free" && bangkokDay === "Sat") {
      db.exec("ROLLBACK");
      return { data: { ok: false, code: "saturday_free" }, error: null };
    }
    const today = now().slice(0, 10);
    const used = profile["usage_date"] === today ? Number(profile["used_today"]) : 0;
    const limit = plan?.["daily_limit"] == null ? null : Number(plan["daily_limit"]);
    if (limit !== null && used >= limit) {
      db.exec("ROLLBACK");
      return { data: { ok: false, code: "quota", remaining: 0 }, error: null };
    }
    const since60 = new Date(Date.now() - 60_000).toISOString();
    const recent = db
      .prepare("SELECT COUNT(*) AS n FROM bypass_logs WHERE user_id=? AND created_at>=?")
      .get(userId, since60) as Row;
    const since30 = new Date(Date.now() - 30_000).toISOString();
    const succeeded = db
      .prepare(
        "SELECT 1 FROM bypass_logs WHERE user_id=? AND status='succeed' AND created_at>=? LIMIT 1",
      )
      .get(userId, since30);
    if (Number(recent["n"]) >= 5 || succeeded) {
      db.exec("ROLLBACK");
      return { data: { ok: false, code: "rate_limited" }, error: null };
    }
    const reservation = randomUUID();
    db.prepare(
      "INSERT INTO bypass_logs(id,user_id,url,status,result,created_at) VALUES (?,?,?,'processing','',?)",
    ).run(reservation, userId, url, now());
    db.prepare(
      "UPDATE profiles SET used_today=?, usage_date=?, total_used=total_used+1 WHERE id=?",
    ).run(used + 1, today, userId);
    db.exec("COMMIT");
    return {
      data: {
        ok: true,
        reservation_id: reservation,
        remaining: limit === null ? null : Math.max(limit - used - 1, 0),
      },
      error: null,
    };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function finishBypass(db: DatabaseSync, args: Row): Result {
  const reservation = String(args["_reservation_id"] ?? "");
  const userId = String(args["_user_id"] ?? "");
  const succeeded = Boolean(args["_succeeded"]);
  db.exec("BEGIN IMMEDIATE");
  try {
    const log = db
      .prepare(
        "SELECT created_at FROM bypass_logs WHERE id=? AND user_id=? AND status='processing'",
      )
      .get(reservation, userId) as Row | undefined;
    if (!log) {
      db.exec("ROLLBACK");
      return { data: { ok: false }, error: null };
    }
    db.prepare("UPDATE bypass_logs SET status=?, result=? WHERE id=?").run(
      succeeded ? "succeed" : "failed",
      String(args["_result"] ?? "").slice(0, 500),
      reservation,
    );
    if (!succeeded)
      db.prepare(
        "UPDATE profiles SET used_today=MAX(used_today-1,0), total_used=MAX(total_used-1,0) WHERE id=?",
      ).run(userId);
    const row = db
      .prepare(
        "SELECT p.used_today, p.usage_date, pl.daily_limit FROM profiles p LEFT JOIN plans pl ON pl.code=p.plan_code WHERE p.id=?",
      )
      .get(userId) as Row;
    const used = row["usage_date"] === now().slice(0, 10) ? Number(row["used_today"]) : 0;
    const limit = row["daily_limit"] == null ? null : Number(row["daily_limit"]);
    db.exec("COMMIT");
    return {
      data: { ok: true, remaining: limit === null ? null : Math.max(limit - used, 0) },
      error: null,
    };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export const database = {
  from(table: string) {
    if (!(table in tableMeta)) throw new Error(`Unknown table: ${table}`);
    if (isPostgresConfigured()) {
      return postgresDatabase.from(table) as unknown as QueryBuilder;
    }
    return new QueryBuilder(table as TableName);
  },
  async rpc(name: string, args: Row) {
    if (isPostgresConfigured()) return postgresDatabase.rpc(name, args);
    return rpc(name, args);
  },
};

export type LocalDatabase = typeof database;
