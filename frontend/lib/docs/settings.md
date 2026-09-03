# Settings

The `/settings` section covers the owner-facing account and connection settings that aren't tied
to any one feature page:

- **Connected apps** (`/settings/connected-apps`) — every application or assistant that has signed
  in and connected to this instance, when it was authorized, and when it was last used. A
  connection can be revoked from here, immediately ending that app's access.
- **Personal access tokens** (`/settings/personal-access-tokens`) — long-lived tokens you create
  yourself for connecting a client that doesn't support the normal sign-in flow. Tokens can be
  created and revoked here; a revoked token stops working immediately.
- **Test messaging** (`/settings/test-messaging`) — sends a one-off email or Telegram message to
  confirm the underlying delivery configuration actually works, without needing an assistant or a
  Scheduled Task to trigger it.
