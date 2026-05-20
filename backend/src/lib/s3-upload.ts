import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { AppError } from "./errors.js";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function readRawS3Env() {
  return {
    bucket: process.env.S3_BUCKET?.trim() || "",
    publicBase: process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, "") || "",
    region: process.env.S3_REGION?.trim() || "us-east-1",
    endpoint: process.env.S3_ENDPOINT?.trim() || "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID?.trim() || "test",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY?.trim() || "test",
    acl: process.env.S3_OBJECT_ACL?.trim() || "",
  };
}

export function isDoctorPhotoUploadConfigured(): boolean {
  const { bucket, publicBase } = readRawS3Env();
  return Boolean(bucket && publicBase);
}

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const { region, endpoint, accessKeyId, secretAccessKey } = readRawS3Env();
  cachedClient = new S3Client({
    region,
    endpoint: endpoint || undefined,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: Boolean(endpoint),
  });
  return cachedClient;
}

async function ensureBucket(client: S3Client, bucket: string) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (e: unknown) {
    const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
    const missing =
      err.name === "NotFound" ||
      err.name === "NoSuchBucket" ||
      err.$metadata?.httpStatusCode === 404;
    if (!missing) throw e;
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

/**
 * Upload a doctor profile image to S3 (or S3-compatible API such as LocalStack).
 * Returns a public HTTP URL to store on the Doctor row.
 */
export async function uploadDoctorProfileImage(
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { bucket, publicBase, acl } = readRawS3Env();
  if (!bucket || !publicBase) {
    throw new AppError(
      503,
      "File uploads are not configured (set S3_BUCKET and S3_PUBLIC_BASE_URL)",
      "S3_NOT_CONFIGURED"
    );
  }

  const ext = MIME_EXT[contentType.toLowerCase()];
  if (!ext) {
    throw new AppError(400, "Unsupported image type", "INVALID_IMAGE_TYPE");
  }

  const key = `doctors/${randomUUID()}.${ext}`;
  const client = getClient();
  await ensureBucket(client, bucket);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ...(acl === "public-read" ? { ACL: "public-read" as const } : {}),
    })
  );

  return `${publicBase}/${key}`;
}
