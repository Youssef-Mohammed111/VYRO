/**
 * Browser-only: shrink a phone photo before upload. Payment proofs from a phone
 * camera are commonly 3–8 MB — over the server's 1.5 MB cap — so we re-encode to
 * a JPEG that fits (max 1600px side, stepping quality down until it does).
 */
export const MAX_UPLOAD_BYTES = 1_400_000;

export type PreparedImage = { mime: "image/jpeg"; base64: string; bytes: number };

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function prepareProofImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image");
  ctx.fillStyle = "#ffffff"; // flatten transparency (PNG screenshots) onto white
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= MAX_UPLOAD_BYTES) {
      return { mime: "image/jpeg", base64: toBase64(new Uint8Array(await blob.arrayBuffer())), bytes: blob.size };
    }
  }
  throw new Error("Image is too large — try a smaller screenshot");
}
