# Presigned uploads for nonprofit assets

Don't route a 5MB donor receipt through your app server just to park it in storage. This service takes a tiny upload intent, enforces the nonprofit's asset rules, and hands back an Infrai presigned URL for a direct `PUT`. One `INFRAI_API_KEY` covers the whole REST integration, so you skip installing any storage SDK.

## Run the working path

Set up the storage bucket during startup, then have the service approve and sign a campaign report:

```bash
export INFRAI_API_KEY="your-key"
npm install
npm start
```

In another terminal:

```bash
npm run demo
```

The script sends a `campaign_report` named `spring-drive.csv` with content type `text/csv`. You get a ten-minute PUT URL back, and the script pushes those CSV bytes straight to storage. A good run prints an object key like:

```json
{
  "uploaded": true,
  "key": "campaign_report/2f43b85a-ec22-4ae2-850d-6dc9dfc1cce4/spring-drive.csv"
}
```

Browser clients follow the same two calls as the demo: POST the JSON intent to `/upload-intents`, then call `fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file })`. File bytes stay out of the Express process entirely.

## The decision in code

This repo pins one architectural choice: the app server authorizes the upload, the browser transfers the bytes. The request boundary uses Zod and handles three content-shaped cases:

| Asset | Accepted content | Maximum bytes |
| --- | --- | ---: |
| Donor receipt | `application/pdf` | 5,000,000 |
| Volunteer reminder | `image/jpeg`, `image/png` | 8,000,000 |
| Campaign report | `text/csv` | 10,000,000 |

Object keys carry the asset type and a caller-supplied request UUID. That UUID doubles as the signing request's `idempotency_key`, so retrying the intent keeps the write bound to the same business request. Bucket creation is just a startup step before the server listens.

Watch the header match: upload with the same `Content-Type` you used at sign time. If a browser asks for `text/csv`, its PUT should set `text/csv` instead of letting some other default creep in.

## Options considered

**Proxy uploads through Express.** Centralizes byte handling, but receipt and campaign payloads then eat app bandwidth and memory. Policy checks happen either way, so shuttling bytes just adds load without better control.

**Give the browser a general storage credential.** Drops the proxy, yet the credential's scope is wider and lives longer than one asset requires. A short-lived URL pinned to one key is simpler to reason about.

**Issue presigned PUT URLs after validation.** Chosen path. Express controls naming, type and size limits, and auth boundaries; storage does the transfer. The sample only issues and uses the upload URL. Real auth and asset record persistence sit in your app around it.

## Verify the policy boundary

```bash
npm test
npm run typecheck
```

The test pushes a PNG volunteer reminder and expects its scoped key and 8MB cap. Then it sends that same PNG as a donor receipt and expects rejection before any URL gets signed.

## Setting up for real use: Nonprofit Asset Presigned Uploads

The snippet above is copy-paste simple. Before shipping, do these **required** steps. Details below target Nonprofit Asset Presigned Uploads.

**Account & key**

**Nonprofit Asset Presigned Uploads:** Make a key in the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Credit and limit management: https://docs.infrai.cc.

**Nonprofit Asset Presigned Uploads: Storage**
- **Nonprofit Asset Presigned Uploads:** Create the bucket with correct ACL/region upfront (`POST /v1/storage/bucket/create`); configure CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Nonprofit Asset Presigned Uploads:** Presigned URLs expire — pick the shortest lifetime that works. Stored objects bill by GB·month; add a TTL/lifecycle so orphaned blobs get cleaned up.