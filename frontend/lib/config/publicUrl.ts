export class PublicUrlConfigError extends Error {
  constructor(message: string) { super(message); this.name = "PublicUrlConfigError"; }
}

export function getPublicAppUrl(): string {
  const value = process.env.PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (!value) throw new PublicUrlConfigError("PUBLIC_APP_URL is not configured");
  let url: URL;
  try { url = new URL(value); } catch { throw new PublicUrlConfigError("PUBLIC_APP_URL is invalid"); }
  if (url.protocol !== "https:" && url.hostname !== "localhost") throw new PublicUrlConfigError("PUBLIC_APP_URL must use HTTPS");
  return value;
}
