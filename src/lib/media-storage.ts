import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { put } from "@vercel/blob";

export type MediaKind = "audio" | "video" | "album" | "preview" | "video-preview" | "cover" | "image" | "hero";

const folders: Record<MediaKind, string> = {
  audio: "audio",
  video: "videos",
  album: "albums",
  preview: "previews",
  "video-preview": "video-previews",
  cover: "covers",
  image: "gallery",
  hero: "hero",
};

const clients = new Map<string, S3Client>();

function getS3Client(privateMedia = false) {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || (endpoint ? "auto" : "us-east-1");
  const accessKeyId = (privateMedia ? process.env.S3_PRIVATE_ACCESS_KEY_ID : process.env.S3_PUBLIC_ACCESS_KEY_ID) || process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = (privateMedia ? process.env.S3_PRIVATE_SECRET_ACCESS_KEY : process.env.S3_PUBLIC_SECRET_ACCESS_KEY) || process.env.S3_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) throw new Error("S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required");

  const cacheKey = `${privateMedia ? "private" : "public"}:${accessKeyId}`;
  if (!clients.has(cacheKey)) clients.set(cacheKey, new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false" } : {}),
    credentials: { accessKeyId, secretAccessKey },
  }));

  return clients.get(cacheKey)!;
}

function isPrivate(kind: MediaKind) { return kind === "audio" || kind === "video" || kind === "album"; }

export function createUploadUrl(kind: MediaKind, originalName: string, contentType: string) {
  const ext = path.extname(originalName).toLowerCase();
  if (!/^\.[a-z0-9]{2,5}$/.test(ext)) throw new Error("Unsupported file extension");
  const privateMedia = isPrivate(kind);
  const bucket = privateMedia ? process.env.S3_PRIVATE_BUCKET : process.env.S3_PUBLIC_BUCKET;
  const id = (privateMedia ? process.env.S3_PRIVATE_ACCESS_KEY_ID : process.env.S3_PUBLIC_ACCESS_KEY_ID) || process.env.S3_ACCESS_KEY_ID;
  const secret = (privateMedia ? process.env.S3_PRIVATE_SECRET_ACCESS_KEY : process.env.S3_PUBLIC_SECRET_ACCESS_KEY) || process.env.S3_SECRET_ACCESS_KEY;
  if (!process.env.S3_ENDPOINT || !bucket || !id || !secret || (!privateMedia && !process.env.S3_PUBLIC_URL)) throw new Error(privateMedia ? "Configure the private Tigris bucket and matching access key pair" : "Configure the public Tigris bucket and access key pair");
  const key = `${folders[kind]}/${Date.now()}-${randomUUID()}${ext}`;
  const client = getS3Client(privateMedia);
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(client, command, { expiresIn: 900 }).then((uploadUrl) => ({ uploadUrl, path: privateMedia ? `r2://${key}` : `${process.env.S3_PUBLIC_URL!.replace(/\/+$/, "")}/${key}`, method: "PUT" as const }));
}

export async function storeMedia(kind: MediaKind, originalName: string, contentType: string, bytes: Uint8Array) {
  const extension = path.extname(originalName).toLowerCase();
  if (!/^\.[a-z0-9]{2,5}$/.test(extension)) throw new Error("Unsupported file extension");

  const folder = folders[kind];
  const key = `${folder}/${Date.now()}-${randomUUID()}${extension}`;
  const hasCompleteS3Config = Boolean(
    process.env.S3_ENDPOINT &&
    process.env.S3_PUBLIC_BUCKET &&
    process.env.S3_PRIVATE_BUCKET &&
    (process.env.S3_PUBLIC_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID) &&
    (process.env.S3_PUBLIC_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY) &&
    process.env.S3_PUBLIC_URL
  );

  if (!hasCompleteS3Config) {
    const privateMedia = isPrivate(kind);
    const isProduction = process.env.NODE_ENV === "production";

    if (privateMedia && isProduction) {
      throw new Error("S3 storage must be fully configured for private media uploads in production");
    }

    if (!privateMedia && isProduction && !process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("Configure complete S3 storage or BLOB_READ_WRITE_TOKEN for production media uploads");
    }

    if (!privateMedia && process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(key, Buffer.from(bytes), {
        access: "public",
        contentType,
        addRandomSuffix: true,
      });
      return blob.url;
    }

    const directory = privateMedia
      ? path.join(process.cwd(), ".private-uploads", folder)
      : path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, path.basename(key)), Buffer.from(bytes));
    return privateMedia ? `local-private://${folder}/${path.basename(key)}` : `/uploads/${key}`;
  }

  const privateMedia = isPrivate(kind);
  const bucket = privateMedia ? process.env.S3_PRIVATE_BUCKET : process.env.S3_PUBLIC_BUCKET;
  if (!bucket) throw new Error(privateMedia ? "S3_PRIVATE_BUCKET is required for full audio" : "S3_PUBLIC_BUCKET is required for public media");
  if (!privateMedia && !process.env.S3_PUBLIC_URL) throw new Error("S3_PUBLIC_URL is required for public media");
  const storageClient = getS3Client(privateMedia);
  await storageClient.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: Buffer.from(bytes),
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));

  return privateMedia ? `r2://${key}` : `${process.env.S3_PUBLIC_URL!.replace(/\/+$/, "")}/${key}`;
}

export async function getPrivateMediaUrl(storedPath: string, expiresIn = 300, disposition = "attachment") {
  if (storedPath.startsWith("local-audio://")) {
    const name = path.basename(storedPath.slice("local-audio://".length));
    const bytes = await readFile(path.join(process.cwd(), ".private-uploads", "audio", name));
    return { localBytes: bytes };
  }
  if (storedPath.startsWith("local-private://")) {
    const relative = storedPath.slice("local-private://".length);
    if (relative.split(/[\\/]/).some((part) => part === "..")) throw new Error("Invalid private media path");
    const bytes = await readFile(path.join(process.cwd(), ".private-uploads", relative));
    return { localBytes: bytes };
  }

  if (!storedPath.startsWith("r2://")) return null;
  const key = storedPath.slice("r2://".length);
  if (!key || key.split("/").some((part) => part === "..")) throw new Error("Invalid private media key");
  if (!process.env.S3_PRIVATE_BUCKET) throw new Error("S3_PRIVATE_BUCKET is not configured");
  const command = new GetObjectCommand({
    Bucket: process.env.S3_PRIVATE_BUCKET,
    Key: key,
    ResponseContentDisposition: `${disposition}; filename="${path.basename(key)}"`,
  });
  const url = await getSignedUrl(getS3Client(true), command, { expiresIn });
  return { url };
}
