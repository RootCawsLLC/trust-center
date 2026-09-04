// One-time local setup: generate .env (with a random AUTH_SECRET) from
// env.sample if it does not already exist.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const samplePath = path.join(root, "env.sample");

if (existsSync(envPath)) {
  console.log(".env already exists — leaving it untouched.");
  process.exit(0);
}

if (!existsSync(samplePath)) {
  console.error("env.sample not found; cannot generate .env");
  process.exit(1);
}

const secret = crypto.randomBytes(32).toString("base64");
const contents = readFileSync(samplePath, "utf8").replace(
  /AUTH_SECRET=".*"/,
  `AUTH_SECRET="${secret}"`,
);

writeFileSync(envPath, contents, { mode: 0o600 });
console.log(".env generated with a fresh AUTH_SECRET.");
