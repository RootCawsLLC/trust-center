// Verifies Salesforce customer matching against the seeded mock directory.
// Read-only — does not modify any data.
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

// Mirrors matchCustomerByDomain() in src/lib/salesforce.ts.
async function match(domain) {
  const { rows } = await client.query(
    `SELECT "accountName" FROM "MockSalesforceCustomer"
     WHERE "primaryDomain" = $1 OR $1 = ANY("additionalDomains") LIMIT 1`,
    [domain.toLowerCase()],
  );
  return rows[0]?.accountName ?? null;
}

before(async () => {
  await client.connect();
});
after(async () => {
  await client.end();
});

test("primary domain matches its customer", async () => {
  assert.equal(await match("contoso.com"), "Contoso Ltd");
});

test("additional domain also matches", async () => {
  assert.equal(await match("northwind.co.uk"), "Northwind Traders");
});

test("domain matching is case-insensitive", async () => {
  assert.equal(await match("Contoso.COM"), "Contoso Ltd");
});

test("unknown domain does not match (would be a lead)", async () => {
  assert.equal(await match("databridge.io"), null);
});
