// Storage abstraction: local filesystem in dev, S3 in prod. Blobs are private;
// the download API route is the only path that reads them, after the gate is
// satisfied.
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "./env";

export type StoredObject = { body: Buffer; contentType: string };

function localPath(key: string): string {
  // Prevent traversal: keys are app-generated, but be defensive.
  const safe = key.replace(/\\/g, "/").replace(/\.\.+/g, "").replace(/^\/+/, "");
  return path.join(path.resolve(env.LOCAL_STORAGE_DIR), safe);
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  if (env.STORAGE_DRIVER === "s3") {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = new S3Client({ region: env.AWS_REGION });
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: "AES256",
      }),
    );
    return;
  }
  const p = localPath(key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
  // Store the content type alongside for local retrieval.
  await fs.writeFile(`${p}.type`, contentType, "utf8");
}

export async function getObject(key: string): Promise<StoredObject> {
  if (env.STORAGE_DRIVER === "s3") {
    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = new S3Client({ region: env.AWS_REGION });
    const res = await s3.send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    );
    const bytes = await res.Body!.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: res.ContentType ?? "application/octet-stream",
    };
  }
  const p = localPath(key);
  const body = await fs.readFile(p);
  let contentType = "application/octet-stream";
  try {
    contentType = await fs.readFile(`${p}.type`, "utf8");
  } catch {
    /* default */
  }
  return { body, contentType };
}

export async function deleteObject(key: string): Promise<void> {
  if (env.STORAGE_DRIVER === "s3") {
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = new S3Client({ region: env.AWS_REGION });
    await s3.send(
      new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    );
    return;
  }
  const p = localPath(key);
  await fs.rm(p, { force: true });
  await fs.rm(`${p}.type`, { force: true });
}
