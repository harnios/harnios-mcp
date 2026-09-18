import { cookies } from "next/headers";
import { authorizeShare, isShareUnavailableError } from "@/lib/sharing/authorize";
import { shareCookieName } from "@/lib/sharing/credentials";
import { contentKind } from "@/lib/sharing/contentPolicy";
import { getFileMetadata } from "@/lib/storage/files";
import { Page } from "@/app/_ui/Page";
import { Banner } from "@/app/_ui/Banner";
import { SharePreview } from "./SharePreview";
import { PasswordForm } from "./PasswordForm";

export default async function PublicSharePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const rawToken = decodeURIComponent(token);
  const { error } = await searchParams;
  const cookieValue = (await cookies()).get(shareCookieName())?.value;
  const authorization = await authorizeShare(rawToken, { cookieValue });

  if (!authorization.ok) {
    if (authorization.reason === "password_required" || authorization.reason === "password_invalid") {
      return (
        <Page size="sm">
          <h1>Shared file</h1>
          <PasswordForm token={rawToken} invalid={authorization.reason === "password_invalid" || error === "password"} />
        </Page>
      );
    }
    return (
      <Page size="sm">
        <Banner tone="warning"><p>This shared file is no longer available.</p></Banner>
      </Page>
    );
  }

  let metadata;
  try {
    metadata = await getFileMetadata(authorization.share.filePath);
  } catch (err) {
    if (isShareUnavailableError(err)) {
      return <Page size="sm"><Banner tone="warning"><p>This shared file is no longer available.</p></Banner></Page>;
    }
    return <Page size="sm"><Banner tone="warning"><p>Unable to open this shared file right now.</p></Banner></Page>;
  }

  return (
    <Page size="lg">
      <h1>{authorization.share.filePath.split("/").pop() ?? "Shared file"}</h1>
      <p className="muted">Available until {new Date(authorization.share.expiresAt).toLocaleString()}</p>
      <SharePreview token={rawToken} path={authorization.share.filePath} kind={contentKind(authorization.share.filePath, metadata.contentType)} />
    </Page>
  );
}
