// Verifies the append-only ledger controls against the running dev database.
// Uses a throwaway temp table for the mutation-rejection checks so the real
// ledger is never polluted, and asserts the real ledger tables carry the guard.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

try {
  process.loadEnvFile(".env");
} catch {
  /* env may already be set */
}

const client = new pg.Client({
  host: "127.0.0.1",
  port: Number(process.env.PGDEV_PORT || 5433),
  user: "postgres",
  password: "postgres",
  database: process.env.PGDEV_DB || "trustcenter",
});

before(async () => {
  await client.connect();
});

after(async () => {
  await client.query("DROP TABLE IF EXISTS _imm_test");
  await client.end();
});

test("guard function rejects UPDATE and DELETE on a guarded table", async () => {
  await client.query("DROP TABLE IF EXISTS _imm_test");
  await client.query("CREATE TABLE _imm_test (id int primary key, v text)");
  await client.query(`CREATE TRIGGER trust_immutable_guard
    BEFORE UPDATE OR DELETE ON _imm_test
    FOR EACH ROW EXECUTE FUNCTION trust_prevent_mutation()`);

  await client.query("INSERT INTO _imm_test (id, v) VALUES (1, 'a')"); // allowed

  await assert.rejects(
    () => client.query("UPDATE _imm_test SET v = 'b' WHERE id = 1"),
    /append-only/i,
  );
  await assert.rejects(
    () => client.query("DELETE FROM _imm_test WHERE id = 1"),
    /append-only/i,
  );

  const { rows } = await client.query("SELECT v FROM _imm_test WHERE id = 1");
  assert.equal(rows[0].v, "a", "row is unchanged after blocked mutations");
  await client.query("DROP TABLE IF EXISTS _imm_test");
});

test("all three ledger tables carry the immutability trigger", async () => {
  const { rows } = await client.query(
    `SELECT c.relname AS table
     FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
     WHERE t.tgname = 'trust_immutable_guard' AND NOT t.tgisinternal`,
  );
  const tables = rows.map((r) => r.table).filter((n) => !n.startsWith("_")).sort();
  assert.deepEqual(tables, ["AuditLog", "DownloadRequest", "NdaAcceptance"]);
});

test("least-privilege runtime role has no UPDATE/DELETE on the ledger", async () => {
  for (const table of ["DownloadRequest", "NdaAcceptance", "AuditLog"]) {
    for (const priv of ["UPDATE", "DELETE"]) {
      const { rows } = await client.query(
        `SELECT has_table_privilege('trust_app', $1, $2) AS has`,
        [`"${table}"`, priv],
      );
      assert.equal(
        rows[0].has,
        false,
        `trust_app must NOT have ${priv} on ${table}`,
      );
    }
    const { rows: ins } = await client.query(
      `SELECT has_table_privilege('trust_app', $1, 'INSERT') AS has`,
      [`"${table}"`],
    );
    assert.equal(ins[0].has, true, `trust_app should have INSERT on ${table}`);
  }
});
