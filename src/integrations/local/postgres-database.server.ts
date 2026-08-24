import { randomUUID } from "node:crypto";
import { neon, neonConfig, Pool, type PoolClient } from "@neondatabase/serverless";
import { serverEnv } from "./runtime-env.server";

type Row = Record<string, unknown>;
// The compatibility query builder intentionally returns runtime-shaped rows.
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
  announcements: { key: "id", booleans: ["is_active"], json: ["image_urls"] },
  changelog_entries: {
    key: "id",
    booleans: ["is_published", "is_important"],
    json: [],
  },
  supported_sites: { key: "id", booleans: ["is_visible"], json: [] },
} as const;

type TableName = keyof typeof tableMeta;
type Filter = { sql: string; values: unknown[] };

let initialization: Promise<void> | undefined;
let workerSchemaMigration: Promise<void> | undefined;

// Pool.query can use Neon's HTTP transport when no pool lifecycle listeners
// are registered. This is required by stateless Cloudflare Worker requests.
neonConfig.poolQueryViaFetch = true;

function now() {
  return new Date().toISOString();
}

function databaseUrl() {
  const value = serverEnv("DATABASE_URL");
  if (!value) throw new Error("DATABASE_URL is not configured");
  if (!/^postgres(?:ql)?:\/\//i.test(value)) throw new Error("DATABASE_URL must be PostgreSQL");

  const parsed = new URL(value);
  const sslMode = parsed.searchParams.get("sslmode")?.toLowerCase();
  if (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") {
    parsed.searchParams.set("sslmode", "verify-full");
  }
  return parsed.toString();
}

function createPool() {
  return new Pool({
    connectionString: databaseUrl(),
    max: 1,
    connectionTimeoutMillis: 15_000,
  });
}

function isCloudflareWorker() {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

export function isPostgresConfigured() {
  return Boolean(serverEnv("DATABASE_URL"));
}

async function initialize() {
  const pool = createPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        reset_code_hash TEXT,
        reset_expires_at TEXT,
        discord_id TEXT UNIQUE,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        username TEXT NOT NULL UNIQUE,
        email TEXT,
        display_name TEXT,
        avatar_url TEXT,
        discord_username TEXT,
        plan_code TEXT NOT NULL DEFAULT 'free',
        plan_expires_at TEXT,
        used_today INTEGER NOT NULL DEFAULT 0,
        usage_date TEXT NOT NULL,
        total_used INTEGER NOT NULL DEFAULT 0,
        is_banned BOOLEAN NOT NULL DEFAULT FALSE,
        bypass_disabled BOOLEAN NOT NULL DEFAULT FALSE,
        trial_claimed_at TEXT,
        admin_note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS user_roles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('admin','user')),
        created_at TEXT NOT NULL,
        UNIQUE(user_id, role)
      );
      CREATE TABLE IF NOT EXISTS revoked_sessions (
        jti TEXT PRIMARY KEY,
        expires_at BIGINT NOT NULL
      );
      DELETE FROM revoked_sessions WHERE expires_at <= EXTRACT(EPOCH FROM NOW())::BIGINT;
      CREATE TABLE IF NOT EXISTS plans (
        code TEXT PRIMARY KEY,
        name_en TEXT NOT NULL,
        name_th TEXT NOT NULL,
        description_en TEXT NOT NULL DEFAULT '',
        description_th TEXT NOT NULL DEFAULT '',
        price DOUBLE PRECISION NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'THB',
        daily_limit INTEGER,
        features_en TEXT NOT NULL DEFAULT '[]',
        features_th TEXT NOT NULL DEFAULT '[]',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        duration_days INTEGER,
        is_trial BOOLEAN NOT NULL DEFAULT FALSE,
        is_featured BOOLEAN NOT NULL DEFAULT FALSE,
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
      CREATE INDEX IF NOT EXISTS bypass_logs_user_created_idx
        ON bypass_logs(user_id, created_at);
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
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS purchase_contact_links (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL DEFAULT 'Discord',
        url TEXT NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
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
        image_urls TEXT NOT NULL DEFAULT '[]',
        link_url TEXT NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
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
        is_published BOOLEAN NOT NULL DEFAULT TRUE,
        is_important BOOLEAN NOT NULL DEFAULT FALSE,
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
        is_visible BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT,
        updated_by TEXT
      );
    `);

    await client.query(
      "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_urls TEXT NOT NULL DEFAULT '[]'",
    );
    await client.query(
      "UPDATE announcements SET image_urls=json_build_array(image_url)::text WHERE image_urls='[]' AND image_url<>''",
    );

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
        false,
        false,
        null,
      ],
      [
        "trial",
        "Free Trial 7 days",
        "ทดลองใช้ฟรี 7 วัน",
        "Full Pro access for 7 days.",
        "ใช้งานระดับ Pro ฟรี 7 วัน",
        0,
        null,
        true,
        true,
        7,
      ],
      [
        "pro",
        "Pro",
        "โปร",
        "Unlimited bypasses and full history.",
        "บายพาสไม่จำกัดและเก็บประวัติเต็มรูปแบบ",
        129,
        null,
        false,
        false,
        30,
      ],
    ] as const;
    for (let index = 0; index < plans.length; index += 1) {
      const item = plans[index]!;
      await client.query(
        `INSERT INTO plans
          (code,name_en,name_th,description_en,description_th,price,currency,daily_limit,
           features_en,features_th,is_active,sort_order,duration_days,is_trial,is_featured,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,'THB',$7,$8,$9,TRUE,$10,$11,$12,$13,$14,$14)
         ON CONFLICT (code) DO NOTHING`,
        [
          item[0],
          item[1],
          item[2],
          item[3],
          item[4],
          item[5],
          item[6],
          JSON.stringify(
            item[0] === "free"
              ? ["5 bypasses per day", "Community support"]
              : ["Unlimited bypasses", "Priority queue"],
          ),
          JSON.stringify(
            item[0] === "free"
              ? ["บายพาสวันละ 5 ลิงก์", "ซัพพอร์ตผ่านชุมชน"]
              : ["บายพาสไม่จำกัด", "คิวพิเศษ"],
          ),
          index,
          item[9],
          item[7],
          item[8],
          stamp,
        ],
      );
    }

    await client.query(
      `INSERT INTO site_settings(key,value,updated_at)
       VALUES ('discord_url','https://discord.gg/devildev',$1),
              ('discord_tag','devildev',$1)
       ON CONFLICT (key) DO NOTHING`,
      [stamp],
    );
    await client.query(
      `INSERT INTO contact_channels
       (id,label,url,handle,kind,is_active,sort_order,created_at,updated_at)
       SELECT $1,'Discord','https://discord.gg/devildev','devildev','discord',TRUE,0,$2,$2
       WHERE NOT EXISTS (SELECT 1 FROM contact_channels WHERE kind='discord')`,
      [randomUUID(), stamp],
    );
    await client.query(
      `INSERT INTO purchase_contact_links
       (id,kind,label,url,is_active,sort_order,created_at,updated_at)
       VALUES ($1,'discord','Discord','',FALSE,0,$2,$2)
       ON CONFLICT (kind) DO NOTHING`,
      [randomUUID(), stamp],
    );
    await client.query(
      `INSERT INTO announcements
       (id,title_en,title_th,body_en,body_th,is_active,sort_order,created_at,updated_at)
       SELECT $1,'Welcome to DevilDev','ยินดีต้อนรับสู่ DevilDev',
              'The Neon-backed service is ready.','ระบบฐานข้อมูล Neon พร้อมใช้งานแล้ว',
              TRUE,0,$2,$2
       WHERE NOT EXISTS (SELECT 1 FROM announcements)`,
      [randomUUID(), stamp],
    );
    await client.query(
      `INSERT INTO changelog_entries
       (id,version,title_en,title_th,body_en,body_th,kind,released_at,is_published,is_important,sort_order,created_at,updated_at)
       SELECT $1,'v3.0.0','Persistent Neon database','ฐานข้อมูล Neon แบบถาวร',
              'User accounts and settings now persist across Render deploys.',
              'บัญชีผู้ใช้และการตั้งค่าจะไม่หายเมื่อ Render Deploy ใหม่',
              'improve',$2,TRUE,TRUE,0,$2,$2
       WHERE NOT EXISTS (SELECT 1 FROM changelog_entries)`,
      [randomUUID(), stamp],
    );

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
    for (let index = 0; index < sites.length; index += 1) {
      await client.query(
        `INSERT INTO supported_sites
         (id,name,domain_or_pattern,status,display_order,is_visible,created_at,updated_at)
         VALUES ($1,$2,$3,'available',$4,TRUE,$5,$5)
         ON CONFLICT (domain_or_pattern) DO NOTHING`,
        [randomUUID(), sites[index]![0], sites[index]![1], (index + 1) * 10, stamp],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function ensurePostgres() {
  // Running the legacy seed transaction per Worker isolate would require a
  // WebSocket connection, which is not safe across stateless fetch lifetimes.
  // Keep additive production migrations on Neon's HTTP driver instead.
  if (isCloudflareWorker()) {
    if (!workerSchemaMigration) {
      workerSchemaMigration = (async () => {
        const sql = neon(databaseUrl());
        await sql.query(
          "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_urls TEXT NOT NULL DEFAULT '[]'",
        );
        await sql.query(
          "UPDATE announcements SET image_urls=json_build_array(image_url)::text WHERE image_urls='[]' AND image_url<>''",
        );
      })().catch((error) => {
        workerSchemaMigration = undefined;
        throw error;
      });
    }
    await workerSchemaMigration;
    return;
  }
  if (!initialization) {
    initialization = initialize().catch((error) => {
      initialization = undefined;
      throw error;
    });
  }
  await initialization;
}

function assertName(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) throw new Error(`Invalid database identifier: ${value}`);
  return value;
}

function encode(table: TableName, key: string, value: unknown) {
  const meta = tableMeta[table];
  if ((meta.booleans as readonly string[]).includes(key)) return Boolean(value);
  if ((meta.json as readonly string[]).includes(key)) return JSON.stringify(value ?? []);
  return value === undefined ? null : value;
}

function decode(table: TableName, original: Row): Row {
  const row = { ...original };
  const meta = tableMeta[table];
  for (const key of meta.booleans as readonly string[]) row[key] = Boolean(row[key]);
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

class PostgresQueryBuilder implements PromiseLike<Result> {
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
    this.filters.push(
      value === null
        ? { sql: `${column} IS NULL`, values: [] }
        : { sql: `${column} IS ?`, values: [encode(this.table, column, value)] },
    );
    return this;
  }
  in(column: string, values: unknown[]) {
    assertName(column);
    this.filters.push(
      values.length
        ? {
            sql: `${column} IN (${values.map(() => "?").join(",")})`,
            values: values.map((v) => encode(this.table, column, v)),
          }
        : { sql: "FALSE", values: [] },
    );
    return this;
  }
  or(expression: string) {
    const clauses = expression.split(",").map((part) => {
      const match = part.match(/^([a-z_][a-z0-9_]*)\.ilike\.(.*)$/i);
      if (!match) throw new Error("Unsupported OR filter");
      return { sql: `${assertName(match[1]!)} ILIKE ?`, value: match[2]! };
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
  private compileWhere(start = 1) {
    let index = start;
    const sql = this.filters.length
      ? ` WHERE ${this.filters.map((filter) => filter.sql.replace(/\?/g, () => `$${index++}`)).join(" AND ")}`
      : "";
    return { sql, values: this.filters.flatMap((filter) => filter.values) };
  }
  private prepareRows() {
    const values = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
    return values.map((original) => {
      const row = { ...original };
      if (tableMeta[this.table].key === "id" && !row["id"]) row["id"] = randomUUID();
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
  private async execute(): Promise<Result> {
    let pool: Pool | undefined;
    try {
      await ensurePostgres();
      pool = createPool();
      if (this.operation === "select") {
        const where = this.compileWhere();
        if (this.wantsCount) {
          const result = await pool.query(
            `SELECT COUNT(*) AS total FROM ${this.table}${where.sql}`,
            where.values,
          );
          return {
            data: this.head ? null : [],
            error: null,
            count: Number(result.rows[0]?.total ?? 0),
          };
        }
        const order = this.orders.length ? ` ORDER BY ${this.orders.join(", ")}` : "";
        const limit = this.maxRows !== null ? ` LIMIT ${this.maxRows}` : "";
        const result = await pool.query(
          `SELECT ${this.selected} FROM ${this.table}${where.sql}${order}${limit}`,
          where.values,
        );
        const rows = result.rows.map((row) => decode(this.table, row));
        return { data: this.one ? (rows[0] ?? null) : rows, error: null };
      }
      if (this.operation === "insert") {
        const client = await pool.connect();
        const returned: Row[] = [];
        try {
          await client.query("BEGIN");
          for (const row of this.prepareRows()) {
            const columns = Object.keys(row).map(assertName);
            const values = columns.map((column) => encode(this.table, column, row[column]));
            const conflictColumns = this.conflict ?? [];
            const updates = columns.filter((column) => !conflictColumns.includes(column));
            const conflict = conflictColumns.length
              ? ` ON CONFLICT (${conflictColumns.join(",")}) ${updates.length ? `DO UPDATE SET ${updates.map((column) => `${column}=EXCLUDED.${column}`).join(",")}` : "DO NOTHING"}`
              : "";
            const returning = this.returning ? ` RETURNING ${this.returning}` : "";
            const result = await client.query(
              `INSERT INTO ${this.table} (${columns.join(",")}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(",")})${conflict}${returning}`,
              values,
            );
            returned.push(...result.rows.map((item) => decode(this.table, item)));
          }
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
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
        const where = this.compileWhere(columns.length + 1);
        const values = [
          ...columns.map((column) => encode(this.table, column, row[column])),
          ...where.values,
        ];
        const returning = this.returning ? ` RETURNING ${this.returning}` : "";
        const result = await pool.query(
          `UPDATE ${this.table} SET ${columns.map((column, index) => `${column}=$${index + 1}`).join(",")}${where.sql}${returning}`,
          values,
        );
        const rows = result.rows.map((item) => decode(this.table, item));
        return { data: this.one ? (rows[0] ?? null) : this.returning ? rows : null, error: null };
      }
      const where = this.compileWhere();
      await pool.query(`DELETE FROM ${this.table}${where.sql}`, where.values);
      return { data: null, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : String(error) },
        count: null,
      };
    } finally {
      await pool?.end();
    }
  }
  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

async function reserveBypass(client: PoolClient, userId: string, url: string): Promise<Result> {
  await client.query("BEGIN");
  try {
    const profile = (await client.query("SELECT * FROM profiles WHERE id=$1 FOR UPDATE", [userId]))
      .rows[0] as Row | undefined;
    if (!profile) {
      await client.query("ROLLBACK");
      return { data: { ok: false, code: "not_signed_in" }, error: null };
    }
    if (profile["is_banned"]) {
      await client.query("ROLLBACK");
      return { data: { ok: false, code: "banned" }, error: null };
    }
    if (profile["bypass_disabled"]) {
      await client.query("ROLLBACK");
      return { data: { ok: false, code: "bypass_disabled" }, error: null };
    }
    let planCode = String(profile["plan_code"]);
    if (profile["plan_expires_at"] && String(profile["plan_expires_at"]) < now()) {
      planCode = "free";
      await client.query("UPDATE profiles SET plan_code='free',plan_expires_at=NULL WHERE id=$1", [
        userId,
      ]);
    }
    let plan = (
      await client.query("SELECT daily_limit FROM plans WHERE code=$1 AND is_active=TRUE", [
        planCode,
      ])
    ).rows[0] as Row | undefined;
    if (!plan) {
      planCode = "free";
      await client.query("UPDATE profiles SET plan_code='free',plan_expires_at=NULL WHERE id=$1", [
        userId,
      ]);
      plan = (await client.query("SELECT daily_limit FROM plans WHERE code='free'")).rows[0] as Row;
    }
    const bangkokDay = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "Asia/Bangkok",
    }).format(new Date());
    if (planCode === "free" && bangkokDay === "Sat") {
      await client.query("ROLLBACK");
      return { data: { ok: false, code: "saturday_free" }, error: null };
    }
    const today = now().slice(0, 10);
    const used = profile["usage_date"] === today ? Number(profile["used_today"]) : 0;
    const limit = plan["daily_limit"] == null ? null : Number(plan["daily_limit"]);
    if (limit !== null && used >= limit) {
      await client.query("ROLLBACK");
      return { data: { ok: false, code: "quota", remaining: 0 }, error: null };
    }
    const recent = await client.query(
      "SELECT COUNT(*) AS n FROM bypass_logs WHERE user_id=$1 AND created_at >= $2",
      [userId, new Date(Date.now() - 60_000).toISOString()],
    );
    const succeeded = await client.query(
      "SELECT 1 FROM bypass_logs WHERE user_id=$1 AND status='succeed' AND created_at >= $2 LIMIT 1",
      [userId, new Date(Date.now() - 30_000).toISOString()],
    );
    if (Number(recent.rows[0]?.n ?? 0) >= 5 || succeeded.rowCount) {
      await client.query("ROLLBACK");
      return { data: { ok: false, code: "rate_limited" }, error: null };
    }
    const reservation = randomUUID();
    await client.query(
      "INSERT INTO bypass_logs(id,user_id,url,status,result,created_at) VALUES ($1,$2,$3,'processing','',$4)",
      [reservation, userId, url, now()],
    );
    await client.query(
      "UPDATE profiles SET used_today=$1,usage_date=$2,total_used=total_used+1 WHERE id=$3",
      [used + 1, today, userId],
    );
    await client.query("COMMIT");
    return {
      data: {
        ok: true,
        reservation_id: reservation,
        remaining: limit === null ? null : Math.max(limit - used - 1, 0),
      },
      error: null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function finishBypass(client: PoolClient, args: Row): Promise<Result> {
  await client.query("BEGIN");
  try {
    const reservation = String(args["_reservation_id"] ?? "");
    const userId = String(args["_user_id"] ?? "");
    const succeeded = Boolean(args["_succeeded"]);
    const log = await client.query(
      "SELECT 1 FROM bypass_logs WHERE id=$1 AND user_id=$2 AND status='processing' FOR UPDATE",
      [reservation, userId],
    );
    if (!log.rowCount) {
      await client.query("ROLLBACK");
      return { data: { ok: false }, error: null };
    }
    await client.query("UPDATE bypass_logs SET status=$1,result=$2 WHERE id=$3", [
      succeeded ? "succeed" : "failed",
      String(args["_result"] ?? "").slice(0, 500),
      reservation,
    ]);
    if (!succeeded)
      await client.query(
        "UPDATE profiles SET used_today=GREATEST(used_today-1,0),total_used=GREATEST(total_used-1,0) WHERE id=$1",
        [userId],
      );
    const row = (
      await client.query(
        "SELECT p.used_today,p.usage_date,pl.daily_limit FROM profiles p LEFT JOIN plans pl ON pl.code=p.plan_code WHERE p.id=$1",
        [userId],
      )
    ).rows[0] as Row;
    const used = row["usage_date"] === now().slice(0, 10) ? Number(row["used_today"]) : 0;
    const limit = row["daily_limit"] == null ? null : Number(row["daily_limit"]);
    await client.query("COMMIT");
    return {
      data: { ok: true, remaining: limit === null ? null : Math.max(limit - used, 0) },
      error: null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function rpc(name: string, args: Row): Promise<Result> {
  let pool: Pool | undefined;
  try {
    await ensurePostgres();
    pool = createPool();
    if (name === "has_role") {
      const result = await pool.query("SELECT 1 FROM user_roles WHERE user_id=$1 AND role=$2", [
        args["_user_id"],
        args["_role"],
      ]);
      return { data: Boolean(result.rowCount), error: null };
    }
    const client = await pool.connect();
    try {
      if (name === "reserve_bypass_slot")
        return await reserveBypass(
          client,
          String(args["_user_id"] ?? ""),
          String(args["_url"] ?? ""),
        );
      if (name === "finish_bypass_slot") return await finishBypass(client, args);
      throw new Error(`Unknown database function: ${name}`);
    } finally {
      client.release();
    }
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : String(error) },
    };
  } finally {
    await pool?.end();
  }
}

function httpSql() {
  return neon(databaseUrl());
}

async function ensureRevokedSessionsTable() {
  await httpSql().query(
    "CREATE TABLE IF NOT EXISTS revoked_sessions (jti TEXT PRIMARY KEY, expires_at BIGINT NOT NULL)",
  );
}

/** Session checks use Neon's HTTP transport, avoiding WebSocket pools in stateless Workers. */
export async function postgresVerifySession(id: string, email: string, jti: string) {
  await ensureRevokedSessionsTable();
  const rows = await httpSql().query(
    `SELECT EXISTS(
       SELECT 1 FROM users
       WHERE id=$1 AND email=$2
     ) AND NOT EXISTS(
       SELECT 1 FROM revoked_sessions WHERE jti=$3
     ) AS valid`,
    [id, email, jti],
  );
  return rows[0]?.["valid"] === true;
}

export async function postgresRevokeSession(jti: string, expiresAt: number) {
  await ensureRevokedSessionsTable();
  await httpSql().query(
    "INSERT INTO revoked_sessions(jti,expires_at) VALUES ($1,$2) ON CONFLICT (jti) DO NOTHING",
    [jti, expiresAt],
  );
}

export async function postgresDeleteUser(userId: string) {
  await ensurePostgres();
  const pool = createPool();
  try {
    await pool.query("DELETE FROM users WHERE id=$1", [userId]);
  } finally {
    await pool.end();
  }
}

export async function postgresSignInDiscordUser(input: {
  discordId: string;
  email: string | null;
  verified: boolean;
  discordUsername: string;
  displayName: string;
  avatarUrl: string;
  passwordHash: string;
  isOwner: boolean;
}) {
  await ensurePostgres();
  const sql = httpSql();
  let user = (
    await sql.query("SELECT id,email FROM users WHERE discord_id=$1", [input.discordId])
  )[0] as { id: string; email: string } | undefined;
  if (!user && input.email && input.verified) {
    user = (
      await sql.query("SELECT id,email FROM users WHERE LOWER(email)=LOWER($1)", [input.email])
    )[0] as { id: string; email: string } | undefined;
    if (user)
      await sql.query("UPDATE users SET discord_id=$1 WHERE id=$2", [input.discordId, user.id]);
  }
  const stamp = now();
  if (!user) {
    const id = randomUUID();
    const email = input.email || `discord-${input.discordId}@users.invalid`;
    const normalized = input.discordUsername.toLowerCase().replace(/[^a-z0-9_]/g, "") || "discord";
    const username = `${normalized.slice(0, 17)}_${input.discordId.slice(-6)}`;
    await sql.transaction((tx) => [
      tx.query(
        "INSERT INTO users(id,email,password_hash,discord_id,created_at) VALUES ($1,$2,$3,$4,$5)",
        [id, email, input.passwordHash, input.discordId, stamp],
      ),
      tx.query(
        `INSERT INTO profiles
         (id,username,email,display_name,avatar_url,discord_username,plan_code,usage_date,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,'free',$7,$8,$8)`,
        [
          id,
          username,
          input.email,
          input.displayName,
          input.avatarUrl,
          input.discordUsername,
          stamp.slice(0, 10),
          stamp,
        ],
      ),
      tx.query("INSERT INTO user_roles(id,user_id,role,created_at) VALUES ($1,$2,$3,$4)", [
        randomUUID(),
        id,
        input.isOwner ? "admin" : "user",
        stamp,
      ]),
    ]);
    user = { id, email };
  } else {
    await sql.query(
      "UPDATE profiles SET display_name=$1,avatar_url=$2,discord_username=$3,updated_at=$4 WHERE id=$5",
      [input.displayName, input.avatarUrl, input.discordUsername, stamp, user.id],
    );
  }
  if (input.isOwner)
    await sql.query(
      "INSERT INTO user_roles(id,user_id,role,created_at) VALUES ($1,$2,'admin',$3) ON CONFLICT (user_id,role) DO NOTHING",
      [randomUUID(), user.id, stamp],
    );
  return user;
}

export const postgresDatabase = {
  from(table: string) {
    if (!(table in tableMeta)) throw new Error(`Unknown table: ${table}`);
    return new PostgresQueryBuilder(table as TableName);
  },
  rpc,
};
