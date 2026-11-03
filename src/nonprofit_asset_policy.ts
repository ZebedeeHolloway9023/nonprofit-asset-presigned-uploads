import { z } from "zod";

export const uploadRequestSchema = z.object({
  assetType: z.enum(["donor_receipt", "volunteer_reminder", "campaign_report"]),
  fileName: z.string().trim().min(1).max(120),
  contentType: z.string().trim().min(1),
  sizeBytes: z.number().int().positive(),
  requestId: z.string().uuid(),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

const rules = {
  donor_receipt: { contentTypes: ["application/pdf"], maxBytes: 5_000_000 },
  volunteer_reminder: { contentTypes: ["image/jpeg", "image/png"], maxBytes: 8_000_000 },
  campaign_report: { contentTypes: ["text/csv"], maxBytes: 10_000_000 },
} as const;

export class AssetPolicyError extends Error {}

function safeFileName(fileName: string): string {
  return fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

export function decideUpload(input: UploadRequest) {
  const rule = rules[input.assetType];
  if (!(rule.contentTypes as readonly string[]).includes(input.contentType)) {
    throw new AssetPolicyError(`${input.assetType} does not accept ${input.contentType}`);
  }
  if (input.sizeBytes > rule.maxBytes) {
    throw new AssetPolicyError(`${input.assetType} exceeds its ${rule.maxBytes}-byte limit`);
  }
  const name = safeFileName(input.fileName);
  if (!name) throw new AssetPolicyError("fileName must contain letters or numbers");

  return {
    key: `${input.assetType}/${input.requestId}/${name}`,
    contentType: input.contentType,
    maxBytes: rule.maxBytes,
  };
}
