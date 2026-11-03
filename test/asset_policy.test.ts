import assert from "node:assert/strict";
import test from "node:test";
import { AssetPolicyError, decideUpload } from "../src/nonprofit_asset_policy.js";

const base = {
  fileName: "march-update.png",
  sizeBytes: 240_000,
  requestId: "4c37f6d7-3e27-4b44-a1a7-f0895304428d",
};

test("volunteer reminders accept an image and produce a scoped object key", () => {
  const decision = decideUpload({
    ...base,
    assetType: "volunteer_reminder",
    contentType: "image/png",
  });
  assert.deepEqual(decision, {
    key: "volunteer_reminder/4c37f6d7-3e27-4b44-a1a7-f0895304428d/march-update.png",
    contentType: "image/png",
    maxBytes: 8_000_000,
  });
});

test("donor receipts reject image content before a URL is signed", () => {
  assert.throws(
    () => decideUpload({ ...base, assetType: "donor_receipt", contentType: "image/png" }),
    AssetPolicyError,
  );
});
