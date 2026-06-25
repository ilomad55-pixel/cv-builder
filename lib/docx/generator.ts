import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  UnderlineType,
  TabStopType,
  TabStopPosition,
} from "docx"

export interface CvData {
  contact?: {
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
    address?: string | null
    profileText?: string | null
  } | null
  experiences: Array<{
    title: string
    company: string
    startDate: string
    endDate?: string | null
    context?: string | null
    achievements?: string | null
    technologies?: string | null
  }>
}

export interface BrandingData {
  companyName: string
  primaryColor: string
  fontFamily: string
}

function hex(color: string): string {
  return color.replace("#", "").toUpperCase()
}

function fullName(cv: CvData): string {
  return [cv.contact?.firstName, cv.contact?.lastName].filter(Boolean).join(" ") || "Nom du candidat"
}

function contactLine(cv: CvData): string {
  return [cv.contact?.email, cv.contact?.phone, cv.contact?.address]
    .filter(Boolean)
    .join("   |   ")
}

// ─── Template 1 : Classique ──────────────────────────────────────────────────
function template1(cv: CvData, b: BrandingData): Document {
  const c = hex(b.primaryColor)
  const f = b.fontFamily
  const children: Paragraph[] = []

  // En-tête
  children.push(new Paragraph({
    children: [new TextRun({ text: fullName(cv), size: 52, bold: true, color: c, font: f })],
    spacing: { after: 80 },
  }))

  const contact = contactLine(cv)
  if (contact) {
    children.push(new Paragraph({
      children: [new TextRun({ text: contact, size: 20, font: f, color: "555555" })],
      spacing: { after: 240 },
    }))
  }

  // Trait horizontal
  children.push(new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: c } },
    spacing: { after: 240 },
  }))

  // Profil
  if (cv.contact?.profileText) {
    children.push(sectionTitle("PROFIL", c, f))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.contact.profileText, size: 20, font: f })],
      spacing: { after: 240 },
    }))
  }

  // Expériences
  if (cv.experiences.length > 0) {
    children.push(sectionTitle("EXPÉRIENCES PROFESSIONNELLES", c, f))
    for (const exp of cv.experiences) {
      children.push(...expBlock1(exp, c, f))
    }
  }

  // Pied de page
  children.push(new Paragraph({
    children: [new TextRun({ text: b.companyName, size: 16, color: "AAAAAA", font: f })],
    alignment: AlignmentType.RIGHT,
    spacing: { before: 400 },
  }))

  return new Document({
    sections: [{ properties: { page: { margin: { top: 860, right: 860, bottom: 860, left: 860 } } }, children }],
  })
}

// ─── Template 2 : Moderne ────────────────────────────────────────────────────
function template2(cv: CvData, b: BrandingData): Document {
  const c = hex(b.primaryColor)
  const f = b.fontFamily
  const children: Paragraph[] = []

  // Nom XL
  children.push(new Paragraph({
    children: [new TextRun({ text: fullName(cv).toUpperCase(), size: 64, bold: true, color: c, font: f })],
    spacing: { after: 120 },
  }))

  // Trait épais sous le nom
  children.push(new Paragraph({
    border: { bottom: { style: BorderStyle.THICK, size: 16, color: c } },
    spacing: { after: 160 },
  }))

  // Contacts en ligne avec bullets
  const contactParts = [cv.contact?.email, cv.contact?.phone, cv.contact?.address].filter(Boolean)
  if (contactParts.length > 0) {
    children.push(new Paragraph({
      children: contactParts.flatMap((part, i) => [
        ...(i > 0 ? [new TextRun({ text: "  ·  ", size: 20, color: c, font: f, bold: true })] : []),
        new TextRun({ text: part!, size: 20, font: f }),
      ]),
      spacing: { after: 320 },
    }))
  }

  // Profil
  if (cv.contact?.profileText) {
    children.push(sectionTitleModerne("PROFIL", c, f))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.contact.profileText, size: 20, font: f })],
      spacing: { after: 280 },
    }))
  }

  // Expériences
  if (cv.experiences.length > 0) {
    children.push(sectionTitleModerne("EXPÉRIENCES", c, f))
    for (const exp of cv.experiences) {
      children.push(...expBlock2(exp, c, f))
    }
  }

  children.push(new Paragraph({
    children: [new TextRun({ text: b.companyName, size: 16, color: "AAAAAA", font: f })],
    alignment: AlignmentType.RIGHT,
    spacing: { before: 400 },
  }))

  return new Document({
    sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }],
  })
}

// ─── Template 3 : ATS Optimisé ───────────────────────────────────────────────
function template3(cv: CvData, b: BrandingData): Document {
  const f = b.fontFamily
  const children: Paragraph[] = []

  // Nom simple
  children.push(new Paragraph({
    children: [new TextRun({ text: fullName(cv), size: 44, bold: true, font: f })],
    spacing: { after: 80 },
  }))

  // Contact sur une ligne
  const contact = contactLine(cv)
  if (contact) {
    children.push(new Paragraph({
      children: [new TextRun({ text: contact, size: 20, font: f })],
      spacing: { after: 200 },
    }))
  }

  // Profil
  if (cv.contact?.profileText) {
    children.push(new Paragraph({
      children: [new TextRun({ text: "Profil professionnel", size: 24, bold: true, font: f })],
      spacing: { before: 200, after: 100 },
    }))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.contact.profileText, size: 20, font: f })],
      spacing: { after: 200 },
    }))
  }

  // Expériences
  if (cv.experiences.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: "Expériences professionnelles", size: 24, bold: true, font: f })],
      spacing: { before: 200, after: 100 },
    }))
    for (const exp of cv.experiences) {
      children.push(...expBlock3(exp, f))
    }
  }

  return new Document({
    sections: [{ properties: { page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } }, children }],
  })
}

// ─── Blocs expérience par template ───────────────────────────────────────────
function expBlock1(exp: CvData["experiences"][0], c: string, f: string): Paragraph[] {
  const paras: Paragraph[] = []
  paras.push(new Paragraph({
    children: [
      new TextRun({ text: exp.title, size: 22, bold: true, font: f }),
      new TextRun({
        text: `\t${exp.startDate}${exp.endDate ? ` — ${exp.endDate}` : " — Présent"}`,
        size: 20, font: f, color: "666666",
      }),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    spacing: { before: 200, after: 40 },
  }))
  paras.push(new Paragraph({
    children: [new TextRun({ text: exp.company, size: 20, font: f, color: c, italics: true })],
    spacing: { after: 60 },
  }))
  if (exp.context) paras.push(labeledLine("Contexte", exp.context, f))
  if (exp.achievements) paras.push(labeledLine("Réalisations", exp.achievements, f))
  if (exp.technologies) paras.push(labeledLine("Technologies", exp.technologies, f))
  return paras
}

function expBlock2(exp: CvData["experiences"][0], c: string, f: string): Paragraph[] {
  const paras: Paragraph[] = []
  // Barre verticale simulée avec left border
  paras.push(new Paragraph({
    children: [
      new TextRun({ text: `${exp.title}  `, size: 22, bold: true, font: f }),
      new TextRun({ text: `${exp.company}`, size: 21, font: f, color: c }),
    ],
    spacing: { before: 240, after: 40 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: c, space: 8 } },
    indent: { left: 120 },
  }))
  paras.push(new Paragraph({
    children: [new TextRun({
      text: `${exp.startDate}${exp.endDate ? ` — ${exp.endDate}` : " — Présent"}`,
      size: 19, font: f, color: "888888",
    })],
    indent: { left: 120 },
    spacing: { after: 60 },
  }))
  if (exp.context) paras.push(new Paragraph({
    children: [new TextRun({ text: exp.context, size: 19, font: f })],
    indent: { left: 120 },
    spacing: { after: 40 },
  }))
  if (exp.achievements) paras.push(new Paragraph({
    children: [new TextRun({ text: exp.achievements, size: 19, font: f })],
    indent: { left: 120 },
    spacing: { after: 40 },
  }))
  if (exp.technologies) paras.push(new Paragraph({
    children: [
      new TextRun({ text: "Stack : ", size: 18, bold: true, font: f, color: c }),
      new TextRun({ text: exp.technologies, size: 18, font: f }),
    ],
    indent: { left: 120 },
    spacing: { after: 60 },
  }))
  return paras
}

function expBlock3(exp: CvData["experiences"][0], f: string): Paragraph[] {
  const paras: Paragraph[] = []
  paras.push(new Paragraph({
    children: [new TextRun({ text: exp.title, size: 22, bold: true, font: f })],
    spacing: { before: 180, after: 30 },
  }))
  paras.push(new Paragraph({
    children: [new TextRun({
      text: `${exp.company} | ${exp.startDate}${exp.endDate ? ` - ${exp.endDate}` : " - Présent"}`,
      size: 20, font: f,
    })],
    spacing: { after: 60 },
  }))
  if (exp.context) paras.push(new Paragraph({
    children: [new TextRun({ text: exp.context, size: 19, font: f })],
    spacing: { after: 40 },
  }))
  if (exp.achievements) paras.push(new Paragraph({
    children: [new TextRun({ text: exp.achievements, size: 19, font: f })],
    spacing: { after: 40 },
  }))
  if (exp.technologies) paras.push(new Paragraph({
    children: [new TextRun({ text: `Compétences : ${exp.technologies}`, size: 19, font: f })],
    spacing: { after: 60 },
  }))
  return paras
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sectionTitle(text: string, c: string, f: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, bold: true, color: c, font: f })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: c } },
    spacing: { before: 280, after: 120 },
  })
}

function sectionTitleModerne(text: string, c: string, f: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text,
      size: 22,
      bold: true,
      color: c,
      font: f,
      underline: { type: UnderlineType.SINGLE, color: c },
    })],
    spacing: { before: 320, after: 120 },
  })
}

function labeledLine(label: string, value: string, f: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label} : `, size: 19, bold: true, font: f }),
      new TextRun({ text: value, size: 19, font: f }),
    ],
    spacing: { after: 40 },
  })
}

// ─── Export principal ─────────────────────────────────────────────────────────
export async function generateCvDocx(
  cv: CvData,
  branding: BrandingData,
  templateId: number
): Promise<Buffer> {
  let doc: Document

  if (templateId === 2) doc = template2(cv, branding)
  else if (templateId === 3) doc = template3(cv, branding)
  else doc = template1(cv, branding)

  return Packer.toBuffer(doc) as Promise<Buffer>
}

export const TEMPLATES = [
  { id: 1, name: "Classique", description: "En-tête élégant, structure claire, séparateur coloré" },
  { id: 2, name: "Moderne", description: "Nom impactant, barre de couleur latérale, style contemporain" },
  { id: 3, name: "ATS Optimisé", description: "Structure simple, lecture machine prioritaire, compatible tous ATS" },
]
