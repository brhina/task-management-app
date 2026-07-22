import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_UPLOADS = path.join(__dirname, "..", "uploads");

function useS3(): boolean {
  return Boolean(process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID);
}

function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(LOCAL_UPLOADS, { recursive: true });
}

export async function saveUploadedFile(file: Express.Multer.File): Promise<{
  url: string;
  name: string;
  mimeType: string;
  size: number;
}> {
  await ensureUploadsDir();

  if (useS3()) {
    const key = `tasks/${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    const client = getS3Client();
    const body = file.buffer ?? (await fs.readFile(file.path));
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
        Body: body,
        ContentType: file.mimetype,
      }),
    );
    if (file.path) {
      await fs.unlink(file.path).catch(() => undefined);
    }
    const base =
      process.env.AWS_S3_PUBLIC_URL ||
      `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com`;
    return {
      url: `${base}/${key}`,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  const filename = file.filename || path.basename(file.path);
  return {
    url: `/uploads/${filename}`,
    name: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}

export async function deleteStoredFile(url: string): Promise<void> {
  try {
    if (useS3() && url.includes("amazonaws.com")) {
      const key = url.split(".amazonaws.com/")[1];
      if (key) {
        const client = getS3Client();
        await client.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: key,
          }),
        );
      }
      return;
    }

    if (url.startsWith("/uploads/")) {
      const filename = path.basename(url);
      await fs.unlink(path.join(LOCAL_UPLOADS, filename)).catch(() => undefined);
    }
  } catch (err) {
    console.error("Failed to delete stored file:", err);
  }
}
