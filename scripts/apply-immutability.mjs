// Harden the append-only ledger tables. Idempotent — safe to re-run.
//
// Enforcement is two-layered:
//   1. BEFORE UPDATE/DELETE triggers that RAISE EXCEPTION. These fire for ANY
//      role issuing normal DML (including the table owner and the app), so a
//      captured request / NDA acceptance / audit entry cannot be altered or
//      removed through the application.
//   2. A least-privilege runtime role (trust_app) granted INSERT + SELECT on
//      the ledger tables and full DML on the operational tables. Point the app
//      at this role in production (RUNTIME_DATABASE_URL) for defense in depth.
//
// Note: a superuser can still TRUNCATE or disable triggers directly — that is
// an accepted, audited break-glass path, not an application capability.
import { PrismaClient } from "@prisma/client";

try {
  process.loadEnvFile(".env");
} catch {
  /* env may already be present */
}

const LEDGER_TABLES = ['"DownloadRequest"', '"NdaAcceptance"', '"AuditLog"'];
const MUTABLE_TABLES = [
  '"User"',
  '"Account"',
  '"Session"',
  '"VerificationToken"',
  '"Document"',
  '"NdaTemplate"',
  '"MockSalesforceCustomer"',
  '"SalesLead"',
  '"DownloadGrant"',
];

const RUNTIME_ROLE = process.env.RUNTIME_DB_ROLE || "trust_app";
const RUNTIME_PASSWORD = process.env.RUNTIME_DB_PASSWORD || "trust_app_dev_pw";
const DB_NAME = process.env.PGDEV_DB || "trustcenter";

const prisma = new PrismaClient();

const statements = [
  // 1. Immutability guard function + triggers.
  `CREATE OR REPLACE FUNCTION trust_prevent_mutation() RETURNS trigger AS $fn$
   BEGIN
     RAISE EXCEPTION
       'Table % is an append-only ledger; % is not permitted', TG_TABLE_NAME, TG_OP
       USING ERRCODE = 'restrict_violation';
   END;
   $fn$ LANGUAGE plpgsql;`,
  ...LEDGER_TABLES.flatMap((t) => [
    `DROP TRIGGER IF EXISTS trust_immutable_guard ON ${t};`,
    `CREATE TRIGGER trust_immutable_guard
       BEFORE UPDATE OR DELETE ON ${t}
       FOR EACH ROW EXECUTE FUNCTION trust_prevent_mutation();`,
  ]),
  // 2. Least-privilege runtime role.
  `DO $do$
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${RUNTIME_ROLE}') THEN
       CREATE ROLE ${RUNTIME_ROLE} LOGIN PASSWORD '${RUNTIME_PASSWORD}';
     END IF;
   END
   $do$;`,
  `GRANT CONNECT ON DATABASE "${DB_NAME}" TO ${RUNTIME_ROLE};`,
  `GRANT USAGE ON SCHEMA public TO ${RUNTIME_ROLE};`,
  // Ledger: INSERT + SELECT only (no UPDATE/DELETE privilege at all).
  ...LEDGER_TABLES.map(
    (t) => `GRANT SELECT, INSERT ON ${t} TO ${RUNTIME_ROLE};`,
  ),
  // Operational tables: full DML.
  ...MUTABLE_TABLES.map(
    (t) =>
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ${t} TO ${RUNTIME_ROLE};`,
  ),
  `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${RUNTIME_ROLE};`,
];

let ok = 0;
for (const sql of statements) {
  try {
    await prisma.$executeRawUnsafe(sql);
    ok++;
  } catch (err) {
    console.error("[harden] statement failed:\n", sql, "\n", err.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

console.log(
  `[harden] applied ${ok} statements: immutability triggers on ${LEDGER_TABLES.join(", ")} + runtime role ${RUNTIME_ROLE}`,
);
await prisma.$disconnect();
