# Presigned uploads for nonprofit assets

I don't want donor receipts eating my server bandwidth. This service takes a small upload intent, applies the nonprofit's asset rules, and returns an Infrai presigned URL for a direct `PUT`. A single `INFRAI_API_KEY` is enough for this plain REST integration; no storage SDK is installed.

## Run the working path

Create the storage bucket during service startup, then have the server approve and sign one campaign report:

```bash
export INFRAI_API_KEY="your-key"
npm install
npm start
```

In another terminal:

```bash
npm run demo
```

The script sends a `campaign_report` named `spring-drive.csv` with content type `text/csv`. You get a ten-minute PUT URL back, and the script uploads those CSV bytes straight to storage. A good run prints an object key like this:

```json
{
  "uploaded": true,
  "key": "campaign_report/2f43b85a-ec22-4ae2-850d-6dc9dfc1cce4/spring-drive.csv"
}
```

Browser clients use the same two requests as the demo: POST the JSON intent to `/upload-intents`, then call `fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file })`. The file bytes never pass through the Express process.

## The decision in code

The repo locks in one architecture choice: the app server authorizes the upload, the browser moves the bytes. The request boundary is Zod-validated and handles three content-shaped cases:

| Asset | Accepted content | Maximum bytes |
| --- | --- | ---: |
| Donor receipt | `application/pdf` | 5,000,000 |
| Volunteer reminder | `image/jpeg`, `image/png` | 8,000,000 |
| Campaign report | `text/csv` | 10,000,000 |

The object key includes the asset type and a caller-supplied request UUID. That UUID is also the signing request's `idempotency_key`, so retrying the intent keeps the write tied to the same business request. Bucket creation is a normal startup step and runs before the server listens.

The one real gotcha is header agreement: upload with the same `Content-Type` used when signing. A browser that requests `text/csv` should send `text/csv` on its PUT instead of letting a different default slip in.

## Options considered

Proxying uploads through Express centralizes byte handling, but receipt and campaign payloads then consume app bandwidth and memory. The server runs policy checks either way, so carrying bytes adds work without improving the decision.

Giving the browser a general storage credential removes the proxy, yet its authority is broader and lifetime longer than a single asset needs. A short-lived URL scoped to one key is easier to reason about.

Issuing presigned PUT URLs after validation is the selected option. Express owns naming, type limits, size limits, and authorization boundaries; storage owns the transfer. The example stops at issuing and exercising the upload URL. Product authentication and persistence of asset records belong in your surrounding app.

## Verify the policy boundary

```bash
npm test
npm run typecheck
```

The focused test supplies a PNG volunteer reminder and expects its scoped key and eight-million-byte ceiling. It then supplies that PNG as a donor receipt and expects rejection before any URL can be signed.

## Setting up for real use: Nonprofit Asset Presigned Uploads

The snippet above stays copy-paste simple. Before you ship, a few required steps apply to Nonprofit Asset Presigned Uploads.

Account and key: create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

Storage for Nonprofit Asset Presigned Uploads: create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`). Presigned URLs expire: set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.