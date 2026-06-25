import { uploadToR2, downloadFromR2, deleteFromR2 } from "./r2"
import { saveFileLocally, readFileLocally, deleteFileLocally } from "./local"

const useR2 = !!(
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_ACCESS_KEY_ID.trim() !== "" &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_SECRET_ACCESS_KEY.trim() !== ""
)

export async function uploadFile(params: {
  buffer: Buffer
  key: string
  contentType: string
}): Promise<string> {
  if (useR2) return uploadToR2(params)
  return saveFileLocally(params.buffer, params.key)
}

export async function downloadFile(key: string): Promise<Buffer> {
  if (useR2) return downloadFromR2(key)
  return readFileLocally(key)
}

export async function deleteFile(key: string): Promise<void> {
  if (useR2) return deleteFromR2(key)
  return deleteFileLocally(key)
}

export function extractKey(url: string): string {
  if (url.startsWith("/api/files/")) return url.replace("/api/files/", "")
  const publicUrl = process.env.R2_PUBLIC_URL ?? ""
  return publicUrl ? url.replace(`${publicUrl}/`, "") : url
}
