# Quickstart: Validate Temporary File Sharing

This guide validates the feature against the local application and its existing S3-compatible storage. It is a manual end-to-end guide for the implementation phase; automated test commands should be added by the implementation tasks.

## Prerequisites

1. Start local storage from the repository root:

   ```sh
   docker compose up -d
   ```

2. Ensure the configured bucket exists and `frontend/.env.local` contains the existing storage and owner credentials.
3. Start the application:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

4. Sign in at `http://localhost:3000/files` and create or upload test files:
   - `share-test.pdf` or an image;
   - `share-test.md` containing harmless Markdown and an attempted raw HTML/script marker;
   - `share-test.docx` or `share-test.zip` for unsupported-format fallback.

## Scenario 1: Create and view an unprotected share

1. From the owner file UI, create a share for the PDF/image with the 1-day duration and no password.
2. Copy the generated URL.
3. Open it in a private browser window with no owner session.
4. Verify the file opens inline, the path is not exposed in the URL, and no owner login is requested.
5. Verify the share management view shows the active share and expiration.

## Scenario 2: Password-protected share

1. Create a second share for the Markdown file with a password and a 1-hour duration.
2. Open the link privately and verify no file content is shown before password entry.
3. Submit an incorrect password and verify a generic failure with no content disclosure.
4. Submit the correct password and verify the safe Markdown view opens.
5. Confirm raw HTML/script content is not executed.

## Scenario 3: Unsupported format

1. Create a share for the DOCX or ZIP file.
2. Open the public link privately.
3. Verify the page says preview is unavailable and does not automatically download the file.
4. Select the explicit download action and verify it downloads as an attachment.

## Scenario 4: Expiration and revocation

1. Create a share and revoke it from the owner share management view.
2. Reopen the copied URL in a private window and verify access is denied.
3. Create a share with an expiration just beyond the current time using the route/UI validation path, and verify creation is rejected when it is in the past.
4. Verify an expiration more than 30 days away is rejected.
5. Verify the original file remains accessible to the signed-in owner after the share is revoked.

## Scenario 5: Scope and file lifecycle

1. Open a valid share and attempt to change its URL to a neighboring file path; verify it cannot access another file.
2. Attempt owner-only file actions from the public context; verify no write action is available or accepted.
3. Delete or move the original file, reopen the share, and verify a non-sensitive unavailable message.
4. Replace the original file at the same path and verify the active share displays the current file version.

## Expected quality gates

- `npm run lint` passes.
- `npm run build` passes.
- Owner-only routes reject signed-out requests.
- Public routes never return raw share metadata, storage keys, passwords, or stack traces.
- Revocation and expiration are enforced on subsequent requests, not only when the page was first opened.

