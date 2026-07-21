/**
 * DigitalOcean Spaces — S3-compatible client
 * الفيديوهات تُخزّن كـ private ولا يمكن الوصول إليها إلا عبر signed URLs مؤقتة
 */
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs";

const REGION      = process.env["SPACES_REGION"]      ?? "lon1";
const BUCKET      = process.env["SPACES_BUCKET"]      ?? "ostathibackup";
const ACCESS_KEY  = process.env["SPACES_ACCESS_KEY"]  ?? "";
const SECRET_KEY  = process.env["SPACES_SECRET_KEY"]  ?? "";
const ENDPOINT    = `https://${REGION}.digitaloceanspaces.com`;

export const spacesClient = new S3Client({
  region:   REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId:     ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
  forcePathStyle: false,
});

// ── رفع ملف من المسار المحلي إلى Spaces ─────────────────────────────────
export async function uploadToSpaces(
  localPath: string,
  key: string,
  contentType = "video/mp4",
): Promise<void> {
  const body = fs.createReadStream(localPath);
  await spacesClient.send(
    new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        body,
      ContentType: contentType,
      ACL:         "private", // محمي — لا يمكن الوصول المباشر
    }),
  );
}

// ── توليد رابط مؤقت (Signed URL) صالح لمدة محددة ────────────────────────
export async function getSignedVideoUrl(
  key: string,
  expiresInSeconds = 7200, // ساعتان
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(spacesClient, command, { expiresIn: expiresInSeconds });
}

// ── حذف ملف من Spaces ────────────────────────────────────────────────────
export async function deleteFromSpaces(key: string): Promise<void> {
  await spacesClient.send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: key }),
  );
}

// ── التحقق من وجود ملف ───────────────────────────────────────────────────
export async function existsInSpaces(key: string): Promise<boolean> {
  try {
    await spacesClient.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export const SPACES_ENABLED =
  ACCESS_KEY.length > 0 && SECRET_KEY.length > 0;
