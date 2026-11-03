export {};

const serviceUrl = process.env.UPLOAD_SERVICE_URL ?? "http://localhost:3000";
const report = Buffer.from("campaign,donations\nspring-drive,18450\n", "utf8");

const intentResponse = await fetch(`${serviceUrl}/upload-intents`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    assetType: "campaign_report",
    fileName: "spring-drive.csv",
    contentType: "text/csv",
    sizeBytes: report.byteLength,
    requestId: crypto.randomUUID(),
  }),
});

if (!intentResponse.ok) throw new Error(await intentResponse.text());
const intent = (await intentResponse.json()) as {
  uploadUrl: string;
  method: "PUT";
  key: string;
  contentType: string;
};

const uploadResponse = await fetch(intent.uploadUrl, {
  method: intent.method,
  headers: { "Content-Type": intent.contentType },
  body: report,
});
if (!uploadResponse.ok) throw new Error(`Upload returned HTTP ${uploadResponse.status}`);
console.log(JSON.stringify({ uploaded: true, key: intent.key }, null, 2));
