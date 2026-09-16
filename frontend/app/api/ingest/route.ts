import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/oauth/session";
import { ingestSingleFile, IngestError } from "@/lib/ingest/service";
import { StorageError } from "@/lib/storage/errors";

function errorResponse(err: unknown) {
  if (err instanceof IngestError) return NextResponse.json({ code: err.code, message: err.message }, { status: err.code === "too_large" ? 413 : err.code === "unsupported_type" ? 415 : 400 });
  if (err instanceof StorageError) {
    const status = err.code === "unsupported_type" ? 415 : err.code === "too_large" ? 413 : 502;
    return NextResponse.json({ code: err.code, message: err.message }, { status });
  }
  return NextResponse.json({ code: "storage_unreachable", message: "Unexpected error ingesting file" }, { status: 502 });
}

export async function POST(request: Request) {
  const authError = await requireOwnerSession();
  if (authError) return authError;
  const formData = await request.formData().catch(() => null);
  const files = formData?.getAll("file") ?? [];
  if (files.length !== 1 || !(files[0] instanceof File)) return NextResponse.json({ code: "invalid_request", message: "Exactly one file entry is required" }, { status: 400 });
  try { return NextResponse.json(await ingestSingleFile(files[0]), { status: 201 }); }
  catch (err) { return errorResponse(err); }
}
