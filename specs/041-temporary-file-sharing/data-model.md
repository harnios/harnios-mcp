# Data Model: Temporary File Sharing

## Temporary Share

One owner-created permission to view one file until expiration or revocation.

| Field | Type | Required | Rules |
|---|---|---:|---|
| `id` | string | yes | Opaque record identifier; unique within the share store. |
| `tokenDigest` | string | yes | Digest of the random bearer token; raw token is never persisted. |
| `filePath` | string | yes | Normalized path to exactly one existing file; must not target reserved metadata prefixes. |
| `createdAt` | ISO timestamp | yes | Creation time. |
| `expiresAt` | ISO timestamp | yes | Future time no more than 30 days after creation. |
| `status` | `active` \| `revoked` | yes | Revocation is terminal. Expiration is derived from `expiresAt`. |
| `revokedAt` | ISO timestamp or null | no | Set when the owner revokes the share. |
| `passwordHash` | string or null | yes | Salted slow hash when password protection is enabled; null otherwise. |
| `passwordSalt` | string or null | yes | Per-share salt when `passwordHash` is present. |
| `updatedAt` | ISO timestamp | yes | Last record mutation time. |
| `lastAccessedAt` | ISO timestamp or null | no | Updated opportunistically for operational visibility; not required for authorization. |
| `accessCount` | non-negative integer | yes | Count of successful content authorizations; starts at zero. |

The owner-facing representation omits `tokenDigest`, `passwordHash`, and `passwordSalt`. The creation response includes the complete share URL exactly once; later listings show only share id, file name/path, status, expiration, password-protected flag, and access metadata.

## Share Lifecycle

```text
active --owner revokes--> revoked
active --clock reaches expiresAt--> expired (derived; record may remain for history)
active --file missing/moved--> unavailable for that request (share remains active)
revoked/expired/unavailable --request--> non-sensitive public error
```

An expired record does not need a background cleanup job for correctness. Listing and authorization treat it as expired based on the current time. Cleanup, if later desired, can be an operational task rather than part of the MVP.

## Visitor Access Cookie

An HTTP-only signed cookie issued only after successful verification of a password-protected share.

| Field | Type | Rules |
|---|---|---|
| `shareId` | string | Binds the cookie to one share record. |
| `tokenDigest` | string | Binds the cookie to the presented link without storing the raw token. |
| `expiresAt` | ISO timestamp | No later than the share expiration and short-lived enough to limit replay. |
| `purpose` | constant | Prevents reuse as an owner session. |

The cookie never grants access after the share record is revoked or expired because public authorization re-reads the current share state.

## Reserved Storage Layout

```text
.shares/
└── <share-id>.json
```

The reserved prefix must be excluded from directory listings, tree search, file counts, and any public file path resolution.

