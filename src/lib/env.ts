// Central environment accessor. Next.js loads .env automatically at runtime.
function opt(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  AUTH_SECRET: process.env.AUTH_SECRET ?? "dev-insecure-secret",
  APP_URL: process.env.APP_URL ?? "http://localhost:3000",

  STORAGE_DRIVER: (process.env.STORAGE_DRIVER ?? "local") as "local" | "s3",
  LOCAL_STORAGE_DIR: process.env.LOCAL_STORAGE_DIR ?? "./storage",
  S3_BUCKET: opt("S3_BUCKET"),
  AWS_REGION: process.env.AWS_REGION ?? "us-east-1",

  DEMO_MODE: (process.env.DEMO_MODE ?? "false").toLowerCase() === "true",
  DEMO_EMAIL: process.env.DEMO_EMAIL ?? "admin@trustcenter.local",
  DEMO_PASSWORD: process.env.DEMO_PASSWORD ?? "ChangeMe!Admin123",

  OKTA_ISSUER: opt("OKTA_ISSUER"),
  OKTA_CLIENT_ID: opt("OKTA_CLIENT_ID"),
  OKTA_CLIENT_SECRET: opt("OKTA_CLIENT_SECRET"),
  GOOGLE_CLIENT_ID: opt("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: opt("GOOGLE_CLIENT_SECRET"),
};

export const ssoEnabled = {
  okta: Boolean(env.OKTA_ISSUER && env.OKTA_CLIENT_ID && env.OKTA_CLIENT_SECRET),
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
};
