import { randomBytes } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET, s3Client } from "@/lib/storage/client";
import { isNotFoundError } from "@/lib/storage/paths";
import type {
  CachedToolCatalog,
  ExternalRateLimitState,
  ExternalServerConnection,
  ExternalServerConnectionSummary,
} from "./types";

/**
 * Reserved key prefixes under the app's configured bucket used to persist
 * External Server Connections and their cached tool catalogs (data-model.md)
 * — siblings of `.oauth/`, `.messaging/`, and `.mcp-tools/status.json`.
 * Excluded from the file explorer and MCP directory listings the same way
 * (lib/storage/directories.ts).
 */
export const EXTERNAL_SERVERS_PREFIX = ".mcp-tools/external-servers/";
export const EXTERNAL_CATALOG_PREFIX = ".mcp-tools/external-catalog/";

function connectionKey(id: string): string {
  return `${EXTERNAL_SERVERS_PREFIX}${id}.json`;
}

function rateLimitKey(id: string): string {
  return `${EXTERNAL_SERVERS_PREFIX}${id}-rate-limit.json`;
}

function catalogKey(id: string): string {
  return `${EXTERNAL_CATALOG_PREFIX}${id}.json`;
}

async function getObject<T>(key: string): Promise<T | undefined> {
  try {
    const result = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = (await result.Body?.transformToString()) ?? "";
    return body ? (JSON.parse(body) as T) : undefined;
  } catch (err) {
    if (isNotFoundError(err)) return undefined;
    throw err;
  }
}

async function putObject<T>(key: string, value: T): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: JSON.stringify(value), ContentType: "application/json" }),
  );
}

function toSummary(connection: ExternalServerConnection): ExternalServerConnectionSummary {
  const { token: _token, ...rest } = connection;
  return { ...rest, hasToken: _token.length > 0 };
}

export interface CreateExternalServerConnectionInput {
  label: string;
  url: string;
  token: string;
}

/** Creates a new connection, enabled by default (FR-001, data-model.md). */
export async function createExternalServerConnection(
  input: CreateExternalServerConnectionInput,
): Promise<ExternalServerConnectionSummary> {
  const id = randomBytes(8).toString("hex");
  const now = new Date().toISOString();

  const record: ExternalServerConnection = {
    id,
    label: input.label,
    url: input.url,
    token: input.token,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };

  await putObject(connectionKey(id), record);
  return toSummary(record);
}

/** Reads one connection's full record, including its token — only for internal use (calling out, editing). Never returned to a caller as-is. */
export async function getExternalServerConnection(id: string): Promise<ExternalServerConnection | undefined> {
  return getObject<ExternalServerConnection>(connectionKey(id));
}

async function listConnectionKeys(): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const page = await s3Client.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: EXTERNAL_SERVERS_PREFIX, ContinuationToken: continuationToken }),
    );
    for (const obj of page.Contents ?? []) {
      if (obj.Key && obj.Key.endsWith(".json") && !obj.Key.endsWith("-rate-limit.json")) keys.push(obj.Key);
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

/** Lists every connection, token omitted (FR-010, FR-015) — for every owner-facing read surface. */
export async function listExternalServerConnections(): Promise<ExternalServerConnectionSummary[]> {
  const keys = await listConnectionKeys();
  const records = await Promise.all(keys.map((key) => getObject<ExternalServerConnection>(key)));
  const connections: ExternalServerConnectionSummary[] = [];
  for (const record of records) {
    if (record) connections.push(toSummary(record));
  }
  return connections;
}

/**
 * Lists every connection's *full* record, token included — for
 * `lib/mcp-tools/externalTools.ts`'s registration/forwarding path only,
 * which must reproduce the token on outbound calls (research.md §7). Never
 * used by any route or page that returns data to a client.
 */
export async function listExternalServerConnectionsFull(): Promise<ExternalServerConnection[]> {
  const keys = await listConnectionKeys();
  const records = await Promise.all(keys.map((key) => getObject<ExternalServerConnection>(key)));
  return records.filter((record): record is ExternalServerConnection => record !== undefined);
}

export interface UpdateExternalServerConnectionInput {
  label?: string;
  url?: string;
  /** Omitted (not just empty) leaves the previously-stored token unchanged (FR-015). */
  token?: string;
}

/** Edits an existing connection; returns `undefined` if `id` doesn't match one. */
export async function updateExternalServerConnection(
  id: string,
  input: UpdateExternalServerConnectionInput,
): Promise<ExternalServerConnectionSummary | undefined> {
  const existing = await getExternalServerConnection(id);
  if (!existing) return undefined;

  const updated: ExternalServerConnection = {
    ...existing,
    label: input.label ?? existing.label,
    url: input.url ?? existing.url,
    token: input.token ?? existing.token,
    updatedAt: new Date().toISOString(),
  };

  await putObject(connectionKey(id), updated);
  return toSummary(updated);
}

/** Pauses/resumes a whole connection without touching its saved config (FR-017). Returns `undefined` if `id` doesn't match one. */
export async function setConnectionEnabled(id: string, enabled: boolean): Promise<ExternalServerConnectionSummary | undefined> {
  const existing = await getExternalServerConnection(id);
  if (!existing) return undefined;

  const updated: ExternalServerConnection = { ...existing, enabled, updatedAt: new Date().toISOString() };
  await putObject(connectionKey(id), updated);
  return toSummary(updated);
}

/** Permanently deletes a connection and its cached catalog/rate-limit records (FR-009). A no-op if `id` is already unknown. */
export async function deleteExternalServerConnection(id: string): Promise<void> {
  await Promise.all(
    [connectionKey(id), catalogKey(id), rateLimitKey(id)].map(async (key) => {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
      } catch (err) {
        if (!isNotFoundError(err)) throw err;
      }
    }),
  );
}

/** Reads the cached tool catalog for one connection, if a fetch has ever succeeded or been attempted. */
export async function getCachedCatalog(connectionId: string): Promise<CachedToolCatalog | undefined> {
  return getObject<CachedToolCatalog>(catalogKey(connectionId));
}

/** Overwrites the cached tool catalog for one connection (research.md §3). */
export async function putCachedCatalog(catalog: CachedToolCatalog): Promise<void> {
  await putObject(catalogKey(catalog.connectionId), catalog);
}

/** Reads the current rate-limit window state for one connection (research.md §6). */
export async function getRateLimitState(connectionId: string): Promise<ExternalRateLimitState | undefined> {
  return getObject<ExternalRateLimitState>(rateLimitKey(connectionId));
}

/** Persists the rate-limit window state for one connection. */
export async function putRateLimitState(connectionId: string, state: ExternalRateLimitState): Promise<void> {
  await putObject(rateLimitKey(connectionId), state);
}
