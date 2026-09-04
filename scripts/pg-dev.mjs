// Local Postgres 17 for development/verification — a real Postgres binary via
// embedded-postgres (no Docker required).
//
//   node scripts/pg-dev.mjs start    # start (init + register service on first run)
//   node scripts/pg-dev.mjs stop     # stop
//   node scripts/pg-dev.mjs status   # status
//   node scripts/pg-dev.mjs remove   # stop + unregister the service (Windows)
//
// Windows note: this machine's only account is an administrator, under which the
// `postgres` binary refuses to run, and a console-launched server is killed by
// the Ctrl+C that Windows sends at every command boundary. The reliable fix is a
// LocalSystem Windows service (Session 0, no console). See the project memo
// "local-postgres-windows-service" for the full rationale. On non-Windows we use
// pg_ctl directly. embedded-postgres bundles only server + initdb + pg_ctl, so DB
// creation and readiness go over the pg wire protocol.
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const IS_WIN = process.platform === "win32";
const DATA_DIR = path.resolve(".pgdata");
const PORT = Number(process.env.PGDEV_PORT || 5433);
const DB = process.env.PGDEV_DB || "trustcenter";
const SERVICE = process.env.PGDEV_SERVICE || "trustpg";
const cmd = process.argv[2] || "start";

const platMap = { win32: "windows", darwin: "darwin", linux: "linux" };
const platPkg = `${platMap[process.platform] ?? process.platform}-${process.arch}`;
const binDir = [
  path.resolve("node_modules/@embedded-postgres", platPkg, "native", "bin"),
  path.resolve(
    "node_modules/embedded-postgres/node_modules/@embedded-postgres",
    platPkg,
    "native",
    "bin",
  ),
].find((c) => existsSync(c));
if (!binDir) {
  console.error(`[pg-dev] could not locate @embedded-postgres/${platPkg}; run 'npm install'.`);
  process.exit(1);
}
const ext = IS_WIN ? ".exe" : "";
const pgCtl = path.join(binDir, `pg_ctl${ext}`);

const embedded = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
});

async function queryable(database = "postgres") {
  const client = new pg.Client({
    host: "127.0.0.1",
    port: PORT,
    user: "postgres",
    password: "postgres",
    database,
    connectionTimeoutMillis: 1500,
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

async function waitReady(timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await queryable()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function ensureInit() {
  if (existsSync(path.join(DATA_DIR, "PG_VERSION"))) return;
  console.log("[pg-dev] initialising cluster in .pgdata ...");
  await embedded.initialise();
}

async function ensureDatabase() {
  if (await queryable(DB)) return;
  const client = new pg.Client({
    host: "127.0.0.1",
    port: PORT,
    user: "postgres",
    password: "postgres",
    database: "postgres",
  });
  await client.connect();
  try {
    await client.query(`CREATE DATABASE "${DB}"`);
    console.log(`[pg-dev] created database "${DB}"`);
  } catch (e) {
    if (!/already exists/i.test(e.message)) throw e;
  } finally {
    await client.end();
  }
}

function sc(args) {
  return spawnSync("sc.exe", args, { encoding: "utf8" });
}

function serviceExists() {
  return sc(["query", SERVICE]).status === 0;
}

async function startWindows() {
  await ensureInit();
  if (!serviceExists()) {
    console.log(`[pg-dev] registering LocalSystem service "${SERVICE}" ...`);
    const r = spawnSync(
      pgCtl,
      ["register", "-N", SERVICE, "-D", DATA_DIR, "-o", `-p ${PORT}`],
      { encoding: "utf8" },
    );
    if (r.status !== 0) {
      console.error("[pg-dev] register failed:", r.stderr || r.stdout);
      process.exit(1);
    }
  }
  if (!(await queryable())) {
    sc(["start", SERVICE]); // ignore "already running"
    if (!(await waitReady())) {
      console.error("[pg-dev] service did not become ready; check Event Viewer / .pgdata logs");
      process.exit(1);
    }
  }
}

async function startUnix() {
  await ensureInit();
  if (!(await queryable())) {
    const logFile = path.join(DATA_DIR, `server-${Date.now()}.log`);
    spawnSync(pgCtl, ["-D", DATA_DIR, "-o", `-p ${PORT}`, "-l", logFile, "start"], {
      stdio: "ignore",
    });
    if (!(await waitReady())) {
      console.error(`[pg-dev] server did not become ready; check ${logFile}`);
      process.exit(1);
    }
  }
}

async function start() {
  if (IS_WIN) await startWindows();
  else await startUnix();
  await ensureDatabase();
  console.log(`[pg-dev] ready: postgresql://postgres:postgres@localhost:${PORT}/${DB}`);
  process.exit(0);
}

function stop() {
  if (IS_WIN) {
    const r = sc(["stop", SERVICE]);
    process.stdout.write(r.stdout || r.stderr || "");
    console.log(`[pg-dev] stop signalled for service "${SERVICE}"`);
  } else {
    spawnSync(pgCtl, ["-D", DATA_DIR, "-m", "fast", "stop"], { stdio: "inherit" });
  }
  process.exit(0);
}

function status() {
  if (IS_WIN) {
    const r = sc(["query", SERVICE]);
    process.stdout.write(r.stdout || r.stderr || `service "${SERVICE}" not found\n`);
  } else {
    spawnSync(pgCtl, ["-D", DATA_DIR, "status"], { stdio: "inherit" });
  }
  process.exit(0);
}

function remove() {
  if (IS_WIN) {
    sc(["stop", SERVICE]);
    const r = sc(["delete", SERVICE]);
    process.stdout.write(r.stdout || r.stderr || "");
    console.log(`[pg-dev] removed service "${SERVICE}"`);
  } else {
    spawnSync(pgCtl, ["-D", DATA_DIR, "-m", "fast", "stop"], { stdio: "inherit" });
  }
  process.exit(0);
}

if (cmd === "start") await start();
else if (cmd === "stop") stop();
else if (cmd === "status") status();
else if (cmd === "remove") remove();
else {
  console.error(`[pg-dev] unknown command: ${cmd}`);
  process.exit(1);
}
