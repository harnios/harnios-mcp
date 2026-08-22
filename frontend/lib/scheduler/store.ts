import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET, s3Client } from "@/lib/storage/client";
import { isNotFoundError } from "@/lib/storage/paths";

/**
 * Reserved key prefix under the app's configured bucket used to persist all
 * scheduler state (Task Execution Records, Last-Run Bookkeeping —
 * data-model.md). Mirrors lib/messaging/store.ts's `.messaging/` convention.
 * Server-internal; excluded from the web file explorer and MCP directory
 * listings (see lib/storage/directories.ts).
 */
export const SCHEDULER_PREFIX = ".scheduler/";

function keyFor(relativeKey: string): string {
  return `${SCHEDULER_PREFIX}${relativeKey}.json`;
}

/** Reads and parses a JSON record, or `undefined` if it doesn't exist. */
export async function getRecord<T>(relativeKey: string): Promise<T | undefined> {
  try {
    const result = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: keyFor(relativeKey) }),
    );
    const body = (await result.Body?.transformToString()) ?? "";
    return body ? (JSON.parse(body) as T) : undefined;
  } catch (err) {
    if (isNotFoundError(err)) return undefined;
    throw err;
  }
}

/** Writes a JSON record, overwriting any existing value at `relativeKey`. */
export async function putRecord<T>(relativeKey: string, value: T): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: keyFor(relativeKey),
      Body: JSON.stringify(value),
      ContentType: "application/json",
    }),
  );
}

/** Deletes a JSON record, if it exists — a no-op (not an error) if it doesn't. */
export async function deleteRecord(relativeKey: string): Promise<void> {
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: keyFor(relativeKey) }));
  } catch (err) {
    if (!isNotFoundError(err)) throw err;
  }
}

/** Lists and parses every JSON record directly under `relativePrefix`. */
export async function listRecords<T>(relativePrefix: string): Promise<T[]> {
  const prefix = `${SCHEDULER_PREFIX}${relativePrefix}`;
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const page = await s3Client.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: continuationToken }),
    );
    for (const obj of page.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  const records = await Promise.all(
    keys.map(async (key): Promise<T | undefined> => {
      const result = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      const body = (await result.Body?.transformToString()) ?? "";
      return body ? (JSON.parse(body) as T) : undefined;
    }),
  );

  const nonEmpty: T[] = [];
  for (const record of records) {
    if (record !== undefined) nonEmpty.push(record);
  }
  return nonEmpty;
}
