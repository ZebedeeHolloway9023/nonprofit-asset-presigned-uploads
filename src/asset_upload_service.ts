import express from "express";
import { ZodError } from "zod";
import { infrai, InfraiError } from "./infrai_storage.js";
import {
  AssetPolicyError,
  decideUpload,
  uploadRequestSchema,
} from "./nonprofit_asset_policy.js";

const bucket = process.env.ASSET_BUCKET ?? "nonprofit-product-assets";
const port = Number(process.env.PORT ?? 3000);
const app = express();
app.use(express.json({ limit: "32kb" }));

app.post("/upload-intents", async (request, response) => {
  try {
    const input = uploadRequestSchema.parse(request.body);
    const decision = decideUpload(input);
    const signed = await infrai.storage.object.presign(bucket, decision.key, {
      op: "put",
      expires_seconds: 600,
      content_type: decision.contentType,
      max_bytes: decision.maxBytes,
      idempotency_key: input.requestId,
    });
    response.status(201).json({
      uploadUrl: signed.url,
      method: "PUT",
      key: decision.key,
      contentType: decision.contentType,
      expiresSeconds: 600,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({ error: "invalid_request", details: error.flatten() });
      return;
    }
    if (error instanceof AssetPolicyError) {
      response.status(422).json({ error: "asset_policy_rejected", message: error.message });
      return;
    }
    if (error instanceof InfraiError) {
      response.status(error.status >= 400 && error.status < 500 ? error.status : 502).json({
        error: error.code,
        message: error.message,
      });
      return;
    }
    response.status(500).json({ error: "unexpected_error" });
  }
});

async function start() {
  await infrai.storage.bucket.create({ name: bucket });
  app.listen(port, () => {
    console.log(`Asset upload service listening on http://localhost:${port}`);
  });
}

await start();
