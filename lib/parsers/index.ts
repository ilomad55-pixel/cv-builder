import { extractTextFromPdf } from "./pdf"
import { extractTextFromDocx } from "./docx"

const MIME_TYPES_PDF = ["application/pdf"]
const MIME_TYPES_WORD = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

// Un CV de moins de 80 caractères est probablement un PDF scanné ou un fichier vide
const MIN_TEXT_LENGTH = 80

export type ParseResult =
  | { success: true; text: string; wordCount: number }
  | { success: false; error: string }

export async function extractText(buffer: Buffer, mimeType: string): Promise<ParseResult> {
  try {
    let text: string

    if (MIME_TYPES_PDF.includes(mimeType)) {
      text = await extractTextFromPdf(buffer)
    } else if (MIME_TYPES_WORD.includes(mimeType)) {
      text = await extractTextFromDocx(buffer)
    } else {
      return { success: false, error: "Format non supporté" }
    }

    if (text.length < MIN_TEXT_LENGTH) {
      return {
        success: false,
        error:
          "Texte non extractible. Si le fichier est un PDF scanné (image), la reconnaissance OCR n'est pas encore prise en charge — convertissez-le en PDF natif ou en Word.",
      }
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length
    return { success: true, text, wordCount }
  } catch {
    return {
      success: false,
      error: "Erreur lors de l'extraction du texte. Vérifiez que le fichier n'est pas corrompu.",
    }
  }
}

export function mimeTypeFromExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase()
  if (ext === "pdf") return "application/pdf"
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  if (ext === "doc") return "application/msword"
  return "application/octet-stream"
}
