# MCP Contract: `get_upload_link`

## Input

No input. The tool transfers no file.

## Success output

```ts
{ url: string; destinationPath: "data/inbox/"; acceptedExtensions: string[]; maxBytes: number }
```

`url` is an absolute URL ending in `/upload`; the response contains no credentials or file body.

## Errors and availability

Use the established MCP `isError` result with `{ code, message }`. Missing/invalid public-origin configuration returns `configuration_error` and never an internal fallback. Register through the normal native-tool path and tool-toggle catalog.
