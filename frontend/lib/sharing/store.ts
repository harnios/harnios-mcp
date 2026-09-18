import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomBytes } from "node:crypto";
import { BUCKET, s3Client } from "@/lib/storage/client";
import { isNotFoundError } from "@/lib/storage/paths";
import type { TemporaryShare, TemporaryShareSummary } from "./types";

export const SHARES_PREFIX = ".shares/";

function keyFor(id: string): string {
  return `${SHARES_PREFIX}${id}.json`;
}

async function getRecord(id: string): Promise<TemporaryShare | undefined> {
  try {
    const result = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: keyFor(id) }));
    const body = (await result.Body?.transformToString()) ?? "";
    return body ? (JSON.parse(body) as TemporaryShare) : undefined;
  } catch (err) {
    if (isNotFoundError(err)) return undefined;
    throw err;
  }
}

async function putRecord(record: TemporaryShare): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: keyFor(record.id), Body: JSON.stringify(record), ContentType: "application/json" }),
  );
}

async function listKeys(): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await s3Client.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: SHARES_PREFIX, ContinuationToken: continuationToken }),
    );
    for (const object of page.Contents ?? []) {
      if (object.Key?.endsWith(".json")) keys.push(object.Key);
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

function summary(record: TemporaryShare): TemporaryShareSummary {
  return {
    id: record.id,
    path: record.filePath,
    expiresAt: record.expiresAt,
    status: record.status === "revoked" ? "revoked" : new Date(record.expiresAt).getTime() <= Date.now() ? "expired" : "active",
    passwordProtected: Boolean(record.passwordHash),
    accessCount: record.accessCount,
    lastAccessedAt: record.lastAccessedAt,
  };
}

export function toTemporaryShareSummary(record: TemporaryShare): TemporaryShareSummary {
  return summary(record);
}

export async function createTemporaryShare(record: Omit<TemporaryShare, "id">): Promise<TemporaryShare> {
  const created = { ...record, id: randomBytes(12).toString("hex") };
  await putRecord(created);
  return created;
}

export async function getTemporaryShare(id: string): Promise<TemporaryShare | undefined> {
  return getRecord(id);
}

export async function getTemporaryShareByTokenDigest(tokenDigest: string): Promise<TemporaryShare | undefined> {
  const keys = await listKeys();
  const records = await Promise.all(keys.map((key) => getRecord(key.slice(SHARES_PREFIX.length, -".json".length))));
  return records.find((record) => record?.tokenDigest === tokenDigest);
}

export async function listTemporaryShares(): Promise<TemporaryShareSummary[]> {
  const keys = await listKeys();
  const records = await Promise.all(keys.map((key) => getRecord(key.slice(SHARES_PREFIX.length, -".json".length))));
  return records.filter((record): record is TemporaryShare => Boolean(record)).map(summary);
}

export async function updateTemporaryShare(record: TemporaryShare): Promise<void> {
  await putRecord(record);
}

export async function revokeTemporaryShare(id: string): Promise<boolean> {
  const record = await getRecord(id);
  if (!record) return false;
  if (record.status !== "revoked") {
    const now = new Date().toISOString();
    await putRecord({ ...record, status: "revoked", revokedAt: now, updatedAt: now });
  }
  return true;
}

export async function recordTemporaryShareAccess(id: string): Promise<void> {
  const record = await getRecord(id);
  if (!record || record.status !== "active" || new Date(record.expiresAt).getTime() <= Date.now()) return;
  const now = new Date().toISOString();
  await putRecord({ ...record, accessCount: record.accessCount + 1, lastAccessedAt: now, updatedAt: now });
}

export async function deleteTemporaryShare(id: string): Promise<void> {
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: keyFor(id) }));
  } catch (err) {
    if (!isNotFoundError(err)) throw err;
  }
}
