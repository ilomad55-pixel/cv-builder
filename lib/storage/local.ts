import { writeFile, readFile, mkdir, unlink } from "fs/promises"
import { join, dirname } from "path"

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(process.cwd(), "uploads")

export async function saveFileLocally(buffer: Buffer, key: string): Promise<string> {
  const filePath = join(UPLOADS_DIR, key)
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, buffer)
  return `/api/files/${key}`
}

export async function readFileLocally(key: string): Promise<Buffer> {
  return readFile(join(UPLOADS_DIR, key))
}

export async function deleteFileLocally(key: string): Promise<void> {
  await unlink(join(UPLOADS_DIR, key))
}
