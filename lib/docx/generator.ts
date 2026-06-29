import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  VerticalAlign,
  AlignmentType,
  BorderStyle,
  ShadingType,
  UnderlineType,
  TabStopType,
  TabStopPosition,
} from "docx"
import type { BlockSettings } from "@/components/settings/BlockSettingsForm"

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CvData {
  contact?: {
    firstName: string
    lastName: string
    headline?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    linkedin?: string | null
    photoUrl?: string | null
    profileText?: string | null
  } | null
  experiences: Array<{
    title: string
    company: string
    client?: string | null
    startDate: string
    endDate?: string | null
    isCurrent?: boolean
    context?: string | null
    achievements?: string | null
    technologies?: string | null
    methods?: string | null
  }>
  skills: Array<{ name: string; category: string; level?: string | null }>
  educations: Array<{
    degree: string
    fieldOfStudy?: string | null
    school: string
    startYear?: string | null
    endYear?: string | null
    honors?: string | null
  }>
  languages: Array<{ language: string; cefrLevel?: string | null; levelLabel?: string | null }>
  certifications: Array<{ name: string; issuer?: string | null; issueDate?: string | null }>
}

export interface BrandingData {
  companyName: string
  primaryColor: string
  secondaryColor?: string
  fontFamily: string
}

export type SectionSettings = Record<string, { visible: boolean; order: number }>

// ─── Helpers de base ──────────────────────────────────────────────────────────
function hex(color: string): string {
  return color.replace("#", "").toUpperCase()
}

function fullName(cv: CvData): string {
  const first = cv.contact?.firstName?.trim()
  const last = cv.contact?.lastName?.trim()
  if (first || last) return [first, last].filter(Boolean).join(" ")
  // Fallback : "serge.dupont@x.com" → "Serge Dupont"
  if (cv.contact?.email) {
    const local = cv.contact.email.split("@")[0].replace(/[._\-+]/g, " ")
    return local.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
  }
  return "Nom du candidat"
}

function contactLine(cv: CvData): string {
  return [cv.contact?.email, cv.contact?.phone, cv.contact?.address, cv.contact?.linkedin]
    .filter(Boolean)
    .join("   |   ")
}

function orderedSectionIds(ss: SectionSettings | null): string[] {
  const DEFAULT_ORDER = ["profile", "experiences", "skills", "methodologies", "soft_skills", "education", "languages", "certifications"]
  if (!ss) return DEFAULT_ORDER
  return [...DEFAULT_ORDER].sort((a, b) => {
    const ao = ss[a]?.order ?? 99
    const bo = ss[b]?.order ?? 99
    return ao - bo
  })
}

function isVisible(ss: SectionSettings | null, id: string): boolean {
  return !ss || !ss[id] || ss[id].visible
}

// ─── Logo helper ──────────────────────────────────────────────────────────────
function detectImageType(buf: Buffer): "png" | "jpg" | "gif" | "bmp" {
  if (buf[0] === 0x89 && buf[1] === 0x50) return "png"
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpg"
  if (buf[0] === 0x47 && buf[1] === 0x49) return "gif"
  if (buf[0] === 0x42 && buf[1] === 0x4d) return "bmp"
  return "png"
}

// Fit dans un max de 140×70 en respectant les proportions
function logoSize(w: number, h: number): { width: number; height: number } {
  const MAX_W = 140
  const MAX_H = 70
  const ratio = Math.min(MAX_W / w, MAX_H / h, 1)
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
}

function logoParagraph(logoBuffer: Buffer): Paragraph {
  let width = 100
  let height = 100
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sizeOf = require("image-size")
    const dims = sizeOf(logoBuffer)
    if (dims?.width && dims?.height) {
      const s = logoSize(dims.width, dims.height)
      width = s.width
      height = s.height
    }
  } catch { /* fallback sur 100×100 */ }

  return new Paragraph({
    children: [
      new ImageRun({
        type: detectImageType(logoBuffer),
        data: logoBuffer,
        transformation: { width, height },
      }),
    ],
    alignment: AlignmentType.RIGHT,
    spacing: { after: 100 },
  })
}

// ─── Helpers photo + table en-tête ───────────────────────────────────────────
function photoSize(w: number, h: number, maxPx = 90): { width: number; height: number } {
  const ratio = Math.min(maxPx / w, maxPx / h, 1)
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
}

function imageRunFromBuffer(buf: Buffer, maxPx: number): ImageRun {
  let width = maxPx, height = maxPx
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sizeOf = require("image-size")
    const dims = sizeOf(buf)
    if (dims?.width && dims?.height) {
      const s = photoSize(dims.width, dims.height, maxPx)
      width = s.width
      height = s.height
    }
  } catch { /* fallback */ }
  return new ImageRun({ type: detectImageType(buf), data: buf, transformation: { width, height } })
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "auto" }
const TABLE_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER }

function emptyCell(pct: number): TableCell {
  return new TableCell({
    children: [new Paragraph("")],
    width: { size: pct, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
  })
}

// Récupère la couleur d'un bloc depuis blockSettings (avec fallback)
function blockColor(bs: BlockSettings | null, id: string, fallback: string): string {
  return hex(bs?.sections?.[id]?.color ?? fallback)
}

function blockFont(bs: BlockSettings | null, id: string, fallback: string): string {
  return bs?.sections?.[id]?.font ?? fallback
}

function blockBg(bs: BlockSettings | null, id: string): string | null {
  const bg = bs?.sections?.[id]?.bgColor
  return bg && bg !== "#ffffff" ? hex(bg) : null
}

// En-tête en tableau 3 colonnes : photo | contenu | logo
function headerTable(
  cv: CvData,
  b: BrandingData,
  photoBuffer: Buffer | null,
  logoBuffer: Buffer | null,
  bs: BlockSettings | null,
  templateStyle: "classique" | "moderne" | "ats"
): Table {
  const c = hex(b.primaryColor)
  const f = b.fontFamily
  const showPhoto = bs?.header?.showPhoto !== false && !!photoBuffer
  const showLogo = bs?.header?.showLogo !== false && !!logoBuffer
  const showHeadline = bs?.header?.showHeadline !== false
  const photoOnLeft = !bs?.header?.layout || bs.header.layout === "photo-left"

  const namePara = new Paragraph({
    children: [new TextRun({
      text: fullName(cv),
      size: templateStyle === "moderne" ? 56 : 46,
      bold: true,
      color: c,
      font: f,
    })],
    spacing: { after: 60 },
  })

  const headlinePara = cv.contact?.headline && showHeadline
    ? new Paragraph({
        children: [new TextRun({ text: cv.contact.headline.toUpperCase(), size: 20, bold: true, color: c, font: f })],
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, color: c, space: 4 },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: c, space: 4 },
          left: { style: BorderStyle.SINGLE, size: 6, color: c, space: 8 },
          right: { style: BorderStyle.SINGLE, size: 6, color: c, space: 8 },
        },
        spacing: { after: 80 },
      })
    : null

  const contactItems = [cv.contact?.phone, cv.contact?.email, cv.contact?.address, cv.contact?.linkedin].filter(Boolean)
  const contactPara = contactItems.length > 0
    ? new Paragraph({
        children: contactItems.flatMap((item, i) => [
          ...(i > 0 ? [new TextRun({ text: "  |  ", size: 18, color: "888888", font: f })] : []),
          new TextRun({ text: item!, size: 18, font: f, color: "444444" }),
        ]),
        spacing: { after: 0 },
      })
    : null

  const mainChildren = [namePara, headlinePara, contactPara].filter(Boolean) as Paragraph[]
  const mainCell = new TableCell({
    children: mainChildren,
    width: { size: showPhoto || showLogo ? 60 : 100, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    borders: TABLE_BORDERS,
  })

  const photoCell = showPhoto && photoBuffer
    ? new TableCell({
        children: [new Paragraph({ children: [imageRunFromBuffer(photoBuffer, 90)], spacing: { after: 0 } })],
        width: { size: 20, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        borders: TABLE_BORDERS,
      })
    : emptyCell(0)

  const logoCell = showLogo && logoBuffer
    ? new TableCell({
        children: [new Paragraph({ children: [imageRunFromBuffer(logoBuffer, 100)], alignment: AlignmentType.RIGHT, spacing: { after: 0 } })],
        width: { size: 20, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        borders: TABLE_BORDERS,
      })
    : emptyCell(0)

  const cells = photoOnLeft
    ? [photoCell, mainCell, logoCell]
    : [mainCell, photoCell, logoCell]

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: [new TableRow({ children: cells })],
  })
}

// ─── Builders de sections partagés ───────────────────────────────────────────
type SectionMap = Map<string, () => Paragraph[]>

function buildSections1(cv: CvData, ss: SectionSettings | null, c: string, f: string, bs: BlockSettings | null = null): SectionMap {
  const m: SectionMap = new Map()

  m.set("profile", () => {
    if (!isVisible(ss, "profile") || !cv.contact?.profileText) return []
    return [
      sectionTitle("PROFIL", c, f),
      new Paragraph({ children: [new TextRun({ text: cv.contact.profileText, size: 20, font: f })], spacing: { after: 240 } }),
    ]
  })

  m.set("experiences", () => {
    if (!isVisible(ss, "experiences") || cv.experiences.length === 0) return []
    return [sectionTitle("EXPÉRIENCES PROFESSIONNELLES", c, f), ...cv.experiences.flatMap((e) => expBlock1(e, c, f))]
  })

  m.set("skills", () => {
    const technical = cv.skills.filter((s) => s.category === "technical" || s.category === "tool")
    if (!isVisible(ss, "skills") || technical.length === 0) return []
    const paras: Paragraph[] = [
      sectionTitle("COMPÉTENCES TECHNIQUES", c, f),
      new Paragraph({ children: [new TextRun({ text: technical.map((s) => s.name).join(" · "), size: 20, font: f })], spacing: { after: 100 } }),
    ]
    return paras
  })

  m.set("soft_skills", () => {
    const soft = cv.skills.filter((s) => s.category === "soft")
    if (!isVisible(ss, "soft_skills") || soft.length === 0) return []
    return [labeledLine("Soft skills", soft.map((s) => s.name).join(", "), f)]
  })

  m.set("methodologies", () => {
    const methods = cv.skills.filter((s) => s.category === "methodology")
    if (!isVisible(ss, "methodologies") || methods.length === 0) return []
    return [labeledLine("Méthodes", methods.map((s) => s.name).join(", "), f)]
  })

  m.set("education", () => {
    if (!isVisible(ss, "education") || cv.educations.length === 0) return []
    const paras: Paragraph[] = [sectionTitle("FORMATION", c, f)]
    for (const edu of cv.educations) {
      paras.push(new Paragraph({
        children: [
          new TextRun({ text: edu.degree, size: 22, bold: true, font: f }),
          new TextRun({ text: edu.fieldOfStudy ? ` — ${edu.fieldOfStudy}` : "", size: 20, font: f }),
          new TextRun({ text: `\t${edu.endYear ?? ""}`, size: 20, font: f, color: "666666" }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 140, after: 30 },
      }))
      paras.push(new Paragraph({ children: [new TextRun({ text: edu.school, size: 20, font: f, color: c, italics: true })], spacing: { after: edu.honors ? 30 : 80 } }))
      if (edu.honors) paras.push(new Paragraph({ children: [new TextRun({ text: `Mention : ${edu.honors}`, size: 19, font: f, color: "666666" })], spacing: { after: 80 } }))
    }
    return paras
  })

  m.set("languages", () => {
    if (!isVisible(ss, "languages") || cv.languages.length === 0) return []
    return [
      sectionTitle("LANGUES", c, f),
      new Paragraph({
        children: cv.languages.flatMap((l, i) => [
          ...(i > 0 ? [new TextRun({ text: "   ·   ", size: 20, font: f, color: "AAAAAA" })] : []),
          new TextRun({ text: l.language, size: 20, bold: true, font: f }),
          new TextRun({ text: l.cefrLevel ? ` (${l.cefrLevel})` : l.levelLabel ? ` — ${l.levelLabel}` : "", size: 20, font: f, color: "777777" }),
        ]),
        spacing: { after: 180 },
      }),
    ]
  })

  m.set("certifications", () => {
    if (!isVisible(ss, "certifications") || cv.certifications.length === 0) return []
    const paras: Paragraph[] = [sectionTitle("CERTIFICATIONS", c, f)]
    for (const cert of cv.certifications) {
      paras.push(new Paragraph({
        children: [
          new TextRun({ text: cert.name, size: 20, bold: true, font: f }),
          new TextRun({ text: cert.issuer ? ` — ${cert.issuer}` : "", size: 20, font: f, color: "666666" }),
          new TextRun({ text: cert.issueDate ? `   ${cert.issueDate}` : "", size: 19, font: f, color: "999999" }),
        ],
        spacing: { before: 80, after: 40 },
      }))
    }
    return paras
  })

  return m
}

function buildSections2(cv: CvData, ss: SectionSettings | null, c: string, f: string, bs: BlockSettings | null = null): SectionMap {
  const m: SectionMap = new Map()

  m.set("profile", () => {
    if (!isVisible(ss, "profile") || !cv.contact?.profileText) return []
    return [sectionTitleModerne("PROFIL", c, f), new Paragraph({ children: [new TextRun({ text: cv.contact.profileText, size: 20, font: f })], spacing: { after: 280 } })]
  })

  m.set("experiences", () => {
    if (!isVisible(ss, "experiences") || cv.experiences.length === 0) return []
    return [sectionTitleModerne("EXPÉRIENCES", c, f), ...cv.experiences.flatMap((e) => expBlock2(e, c, f))]
  })

  m.set("skills", () => {
    const technical = cv.skills.filter((s) => s.category === "technical" || s.category === "tool")
    if (!isVisible(ss, "skills") || technical.length === 0) return []
    return [
      sectionTitleModerne("COMPÉTENCES", c, f),
      new Paragraph({ children: [new TextRun({ text: technical.map((s) => s.name).join("  ·  "), size: 20, font: f })], spacing: { after: 80 } }),
    ]
  })

  m.set("soft_skills", () => {
    const soft = cv.skills.filter((s) => s.category === "soft")
    if (!isVisible(ss, "soft_skills") || soft.length === 0) return []
    return [new Paragraph({ children: [new TextRun({ text: "Soft : ", size: 19, bold: true, color: c, font: f }), new TextRun({ text: soft.map((s) => s.name).join(", "), size: 19, font: f })], spacing: { after: 80 } })]
  })

  m.set("methodologies", () => {
    const methods = cv.skills.filter((s) => s.category === "methodology")
    if (!isVisible(ss, "methodologies") || methods.length === 0) return []
    return [new Paragraph({ children: [new TextRun({ text: "Méthodes : ", size: 19, bold: true, color: c, font: f }), new TextRun({ text: methods.map((s) => s.name).join(", "), size: 19, font: f })], spacing: { after: 80 } })]
  })

  m.set("education", () => {
    if (!isVisible(ss, "education") || cv.educations.length === 0) return []
    const paras: Paragraph[] = [sectionTitleModerne("FORMATION", c, f)]
    for (const edu of cv.educations) {
      paras.push(new Paragraph({
        children: [new TextRun({ text: edu.degree, size: 21, bold: true, font: f }), new TextRun({ text: edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : "", size: 20, font: f })],
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: c, space: 8 } },
        indent: { left: 120 },
        spacing: { before: 160, after: 40 },
      }))
      paras.push(new Paragraph({ children: [new TextRun({ text: `${edu.school}${edu.endYear ? ` · ${edu.endYear}` : ""}`, size: 20, font: f, color: c })], indent: { left: 120 }, spacing: { after: 80 } }))
    }
    return paras
  })

  m.set("languages", () => {
    if (!isVisible(ss, "languages") || cv.languages.length === 0) return []
    return [
      sectionTitleModerne("LANGUES", c, f),
      new Paragraph({ children: cv.languages.flatMap((l, i) => [...(i > 0 ? [new TextRun({ text: "  ·  ", size: 20, color: c, font: f })] : []), new TextRun({ text: `${l.language}${l.cefrLevel ? ` (${l.cefrLevel})` : ""}`, size: 20, font: f })]), spacing: { after: 160 } }),
    ]
  })

  m.set("certifications", () => {
    if (!isVisible(ss, "certifications") || cv.certifications.length === 0) return []
    const paras: Paragraph[] = [sectionTitleModerne("CERTIFICATIONS", c, f)]
    for (const cert of cv.certifications) {
      paras.push(new Paragraph({ children: [new TextRun({ text: cert.name, size: 20, bold: true, font: f }), new TextRun({ text: cert.issuer ? ` — ${cert.issuer}` : "", size: 20, font: f, color: "666666" })], spacing: { before: 60, after: 40 } }))
    }
    return paras
  })

  return m
}

function buildSections3(cv: CvData, ss: SectionSettings | null, f: string, bs: BlockSettings | null = null): SectionMap {
  const m: SectionMap = new Map()

  m.set("profile", () => {
    if (!isVisible(ss, "profile") || !cv.contact?.profileText) return []
    return [atsSectionTitle("Profil professionnel", f), new Paragraph({ children: [new TextRun({ text: cv.contact.profileText, size: 20, font: f })], spacing: { after: 200 } })]
  })

  m.set("skills", () => {
    const technical = cv.skills.filter((s) => s.category === "technical" || s.category === "tool")
    if (!isVisible(ss, "skills") || technical.length === 0) return []
    return [atsSectionTitle("Compétences techniques", f), new Paragraph({ children: [new TextRun({ text: technical.map((s) => s.name).join(", "), size: 20, font: f })], spacing: { after: 80 } })]
  })

  m.set("soft_skills", () => {
    const soft = cv.skills.filter((s) => s.category === "soft")
    if (!isVisible(ss, "soft_skills") || soft.length === 0) return []
    return [new Paragraph({ children: [new TextRun({ text: `Soft skills : ${soft.map((s) => s.name).join(", ")}`, size: 20, font: f })], spacing: { after: 200 } })]
  })

  m.set("methodologies", () => {
    const methods = cv.skills.filter((s) => s.category === "methodology")
    if (!isVisible(ss, "methodologies") || methods.length === 0) return []
    return [new Paragraph({ children: [new TextRun({ text: `Méthodes : ${methods.map((s) => s.name).join(", ")}`, size: 20, font: f })], spacing: { after: 80 } })]
  })

  m.set("experiences", () => {
    if (!isVisible(ss, "experiences") || cv.experiences.length === 0) return []
    return [atsSectionTitle("Expériences professionnelles", f), ...cv.experiences.flatMap((e) => expBlock3(e, f))]
  })

  m.set("education", () => {
    if (!isVisible(ss, "education") || cv.educations.length === 0) return []
    const paras: Paragraph[] = [atsSectionTitle("Formation", f)]
    for (const edu of cv.educations) {
      paras.push(new Paragraph({ children: [new TextRun({ text: edu.degree, size: 22, bold: true, font: f })], spacing: { before: 100, after: 30 } }))
      paras.push(new Paragraph({ children: [new TextRun({ text: `${edu.school}${edu.endYear ? ` | ${edu.endYear}` : ""}${edu.honors ? ` | ${edu.honors}` : ""}`, size: 20, font: f })], spacing: { after: 80 } }))
    }
    return paras
  })

  m.set("languages", () => {
    if (!isVisible(ss, "languages") || cv.languages.length === 0) return []
    return [
      atsSectionTitle("Langues", f),
      new Paragraph({ children: [new TextRun({ text: cv.languages.map((l) => `${l.language}${l.cefrLevel ? ` (${l.cefrLevel})` : ""}`).join(" | "), size: 20, font: f })], spacing: { after: 200 } }),
    ]
  })

  m.set("certifications", () => {
    if (!isVisible(ss, "certifications") || cv.certifications.length === 0) return []
    const paras: Paragraph[] = [atsSectionTitle("Certifications", f)]
    for (const cert of cv.certifications) {
      paras.push(new Paragraph({ children: [new TextRun({ text: `${cert.name}${cert.issuer ? ` — ${cert.issuer}` : ""}${cert.issueDate ? ` (${cert.issueDate})` : ""}`, size: 20, font: f })], spacing: { before: 60, after: 40 } }))
    }
    return paras
  })

  return m
}

// ─── Templates ────────────────────────────────────────────────────────────────
type DocChildren = Array<Paragraph | Table>

function template1(cv: CvData, b: BrandingData, ss: SectionSettings | null, logo: Buffer | null, photo: Buffer | null, bs: BlockSettings | null): Document {
  const c = hex(b.primaryColor)
  const f = b.fontFamily
  const children: DocChildren = []

  children.push(headerTable(cv, b, photo, logo, bs, "classique"))
  children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: c } }, spacing: { before: 160, after: 200 } }))

  const sections = buildSections1(cv, ss, c, f, bs)
  for (const id of orderedSectionIds(ss)) {
    children.push(...(sections.get(id)?.() ?? []))
  }

  children.push(new Paragraph({ children: [new TextRun({ text: b.companyName, size: 16, color: "AAAAAA", font: f })], alignment: AlignmentType.RIGHT, spacing: { before: 400 } }))

  return new Document({ sections: [{ properties: { page: { margin: { top: 860, right: 860, bottom: 860, left: 860 } } }, children }] })
}

function template2(cv: CvData, b: BrandingData, ss: SectionSettings | null, logo: Buffer | null, photo: Buffer | null, bs: BlockSettings | null): Document {
  const c = hex(b.primaryColor)
  const f = b.fontFamily
  const children: DocChildren = []

  children.push(headerTable(cv, b, photo, logo, bs, "moderne"))
  children.push(new Paragraph({ border: { bottom: { style: BorderStyle.THICK, size: 16, color: c } }, spacing: { before: 160, after: 200 } }))

  const sections = buildSections2(cv, ss, c, f, bs)
  for (const id of orderedSectionIds(ss)) {
    children.push(...(sections.get(id)?.() ?? []))
  }

  children.push(new Paragraph({ children: [new TextRun({ text: b.companyName, size: 16, color: "AAAAAA", font: f })], alignment: AlignmentType.RIGHT, spacing: { before: 400 } }))

  return new Document({ sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }] })
}

function template3(cv: CvData, b: BrandingData, ss: SectionSettings | null, logo: Buffer | null, photo: Buffer | null, bs: BlockSettings | null): Document {
  const f = b.fontFamily
  const children: DocChildren = []

  children.push(headerTable(cv, b, photo, logo, bs, "ats"))
  children.push(new Paragraph({ spacing: { after: 160 } }))

  const sections = buildSections3(cv, ss, f, bs)
  for (const id of orderedSectionIds(ss)) {
    children.push(...(sections.get(id)?.() ?? []))
  }

  return new Document({ sections: [{ properties: { page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } }, children }] })
}

// ─── Blocs expérience ────────────────────────────────────────────────────────
type Exp = CvData["experiences"][0]

function expBlock1(exp: Exp, c: string, f: string): Paragraph[] {
  const dateStr = exp.endDate ? `${exp.startDate} — ${exp.endDate}` : exp.isCurrent ? `${exp.startDate} — Présent` : exp.startDate
  const companyStr = exp.client ? `${exp.company} (Client : ${exp.client})` : exp.company
  const paras: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: exp.title, size: 22, bold: true, font: f }), new TextRun({ text: `\t${dateStr}`, size: 20, font: f, color: "666666" })], tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }], spacing: { before: 200, after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: companyStr, size: 20, font: f, color: c, italics: true })], spacing: { after: 60 } }),
  ]
  if (exp.context) paras.push(...labeledBlock("Contexte", exp.context, f))
  if (exp.achievements) paras.push(...labeledBlock("Réalisations", exp.achievements, f))
  if (exp.technologies) paras.push(labeledLine("Technologies", exp.technologies, f))
  if (exp.methods) paras.push(labeledLine("Méthodes", exp.methods, f))
  return paras
}

function expBlock2(exp: Exp, c: string, f: string): Paragraph[] {
  const companyStr = exp.client ? `${exp.company} · Client : ${exp.client}` : exp.company
  const dateStr = exp.endDate ? `${exp.startDate} — ${exp.endDate}` : exp.isCurrent ? `${exp.startDate} — Présent` : exp.startDate
  const paras: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: `${exp.title}  `, size: 22, bold: true, font: f }), new TextRun({ text: companyStr, size: 21, font: f, color: c })], spacing: { before: 240, after: 40 }, border: { left: { style: BorderStyle.SINGLE, size: 12, color: c, space: 8 } }, indent: { left: 120 } }),
    new Paragraph({ children: [new TextRun({ text: dateStr, size: 19, font: f, color: "888888" })], indent: { left: 120 }, spacing: { after: 60 } }),
  ]
  if (exp.context) paras.push(...textLines(exp.context, 19, f, 120))
  if (exp.achievements) paras.push(...textLines(exp.achievements, 19, f, 120))
  if (exp.technologies) paras.push(new Paragraph({ children: [new TextRun({ text: "Stack : ", size: 18, bold: true, font: f, color: c }), new TextRun({ text: exp.technologies, size: 18, font: f })], indent: { left: 120 }, spacing: { after: 60 } }))
  return paras
}

function expBlock3(exp: Exp, f: string): Paragraph[] {
  const dateStr = exp.endDate ? `${exp.startDate} - ${exp.endDate}` : exp.isCurrent ? `${exp.startDate} - Présent` : exp.startDate
  const companyStr = exp.client ? `${exp.company} (Client : ${exp.client})` : exp.company
  const paras: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: exp.title, size: 22, bold: true, font: f })], spacing: { before: 180, after: 30 } }),
    new Paragraph({ children: [new TextRun({ text: `${companyStr} | ${dateStr}`, size: 20, font: f })], spacing: { after: 60 } }),
  ]
  if (exp.context) paras.push(...textLines(exp.context, 19, f))
  if (exp.achievements) paras.push(...textLines(exp.achievements, 19, f))
  if (exp.technologies) paras.push(new Paragraph({ children: [new TextRun({ text: `Compétences : ${exp.technologies}`, size: 19, font: f })], spacing: { after: 60 } }))
  return paras
}

// ─── Helpers typographie ──────────────────────────────────────────────────────
function sectionTitle(text: string, c: string, f: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, size: 22, bold: true, color: c, font: f })], border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: c } }, spacing: { before: 280, after: 120 } })
}

function sectionTitleModerne(text: string, c: string, f: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, size: 22, bold: true, color: c, font: f, underline: { type: UnderlineType.SINGLE, color: c } })], spacing: { before: 320, after: 120 } })
}

function atsSectionTitle(text: string, f: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, size: 24, bold: true, font: f })], border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" } }, spacing: { before: 200, after: 100 } })
}

function labeledLine(label: string, value: string, f: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: `${label} : `, size: 19, bold: true, font: f }), new TextRun({ text: value, size: 19, font: f })], spacing: { after: 40 } })
}

// Découpe un texte multi-lignes en paragraphes individuels (1 par ligne non vide)
function textLines(value: string, size: number, f: string, indent?: number): Paragraph[] {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => new Paragraph({
      children: [new TextRun({ text: line, size, font: f })],
      indent: indent ? { left: indent } : undefined,
      spacing: { after: 40 },
    }))
}

// Bloc label + lignes : "Contexte :" suivi de chaque ligne en retrait
function labeledBlock(label: string, value: string, f: string, indent = 120): Paragraph[] {
  const lines = value.split("\n").map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return []
  // Une seule ligne : format compact "Label : valeur"
  if (lines.length === 1) return [labeledLine(label, lines[0], f)]
  return [
    new Paragraph({ children: [new TextRun({ text: `${label} :`, size: 19, bold: true, font: f })], spacing: { after: 20 } }),
    ...lines.map((line) => new Paragraph({
      children: [new TextRun({ text: line, size: 19, font: f })],
      indent: { left: indent },
      spacing: { after: 40 },
    })),
  ]
}

// ─── Template ILOMAD — 2 colonnes ────────────────────────────────────────────

// Résout la couleur secondaire : #ffffff = non défini → orange par défaut
function resolveSecondary(raw: string | undefined | null): string {
  if (!raw) return "e67700"
  const h = hex(raw)
  return h === "ffffff" || h === "FFFFFF" ? "e67700" : h
}

function ilomadHeaderTable(
  cv: CvData,
  b: BrandingData,
  photoBuffer: Buffer | null,
  logoBuffer: Buffer | null,
  bs: BlockSettings | null
): Table {
  const primary = hex(b.primaryColor)
  const secondary = resolveSecondary(b.secondaryColor)
  const f = b.fontFamily
  const showPhoto = bs?.header?.showPhoto !== false && !!photoBuffer
  const showLogo  = bs?.header?.showLogo  !== false && !!logoBuffer
  const photoOnLeft = !bs?.header?.layout || bs.header.layout === "photo-left"
  const fill = { type: ShadingType.CLEAR, color: "auto", fill: primary }
  const marg = { top: 160, bottom: 160, left: 160, right: 160 }

  // Nom en blanc, titre en couleur secondaire (orange)
  const namePara = new Paragraph({
    children: [new TextRun({ text: fullName(cv), size: 44, bold: true, color: "FFFFFF", font: f })],
    alignment: AlignmentType.CENTER, shading: fill, spacing: { before: 60, after: 20 },
  })
  const titlePara = cv.contact?.headline
    ? new Paragraph({
        children: [new TextRun({ text: cv.contact.headline.toUpperCase(), size: 22, bold: true, color: secondary, font: f })],
        alignment: AlignmentType.CENTER, shading: fill, spacing: { after: 60 },
      })
    : null
  // Ligne contact sous le titre
  const contactLine = [cv.contact?.email, cv.contact?.phone].filter(Boolean).join("   |   ")
  const contactPara = contactLine
    ? new Paragraph({
        children: [new TextRun({ text: contactLine, size: 17, color: "DDDDDD", font: f })],
        alignment: AlignmentType.CENTER, shading: fill, spacing: { after: 80 },
      })
    : null

  const centerChildren = [namePara, titlePara, contactPara].filter(Boolean) as Paragraph[]

  const hasLeft  = showPhoto
  const hasRight = showLogo
  const centerPct = hasLeft && hasRight ? 60 : (hasLeft || hasRight) ? 80 : 100
  const sidePct   = 20

  const photoCell = showPhoto && photoBuffer
    ? new TableCell({ children: [new Paragraph({ children: [imageRunFromBuffer(photoBuffer, 85)], alignment: AlignmentType.CENTER, spacing: { after: 0 } })], width: { size: sidePct, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, shading: fill, borders: TABLE_BORDERS, margins: marg })
    : null

  const logoCell = showLogo && logoBuffer
    ? new TableCell({ children: [new Paragraph({ children: [imageRunFromBuffer(logoBuffer, 70)], alignment: AlignmentType.CENTER, spacing: { after: 0 } })], width: { size: sidePct, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, shading: fill, borders: TABLE_BORDERS, margins: marg })
    : null

  const centerCell = new TableCell({ children: centerChildren, width: { size: centerPct, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, shading: fill, borders: TABLE_BORDERS, margins: { top: 200, bottom: 200, left: 200, right: 200 } })

  const cells: TableCell[] = []
  if (photoOnLeft) {
    if (photoCell) cells.push(photoCell)
    cells.push(centerCell)
    if (logoCell) cells.push(logoCell)
  } else {
    cells.push(centerCell)
    if (photoCell) cells.push(photoCell)
    if (logoCell) cells.push(logoCell)
  }

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: TABLE_BORDERS, rows: [new TableRow({ children: cells })] })
}

// Titre de section avec souligné coloré (orange)
function ilomadSectionTitle(text: string, color: string, f: string, textColor?: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, bold: true, color: textColor ?? color, font: f })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color } },
    spacing: { before: 240, after: 120 },
  })
}

function ilomadSubTitle(text: string, color: string, f: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 18, bold: true, color, font: f })],
    spacing: { before: 140, after: 60 },
  })
}

function ilomadBullet(text: string, f: string, bulletColor = "444444", textColor = "333333"): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: "• ", size: 19, bold: true, font: f, color: bulletColor }),
      new TextRun({ text, size: 18, font: f, color: textColor }),
    ],
    indent: { left: 80 },
    spacing: { after: 50 },
  })
}

// Colonne gauche — fond sombre (primary), texte blanc, accents orange (secondary)
function ilomadLeftColumn(cv: CvData, primary: string, secondary: string, f: string): Paragraph[] {
  const WHITE = "FFFFFF"
  const paras: Paragraph[] = []

  const functional = cv.skills.filter((s) => s.category === "methodology")
  const metier     = cv.skills.filter((s) => s.category === "tool")
  const technical  = cv.skills.filter((s) => s.category === "technical")
  const soft       = cv.skills.filter((s) => s.category === "soft")

  const skillBullet = (name: string) => new Paragraph({
    children: [
      new TextRun({ text: "• ", size: 19, bold: true, color: secondary, font: f }),
      new TextRun({ text: name, size: 18, font: f, color: WHITE }),
    ],
    indent: { left: 80 },
    spacing: { after: 50 },
  })

  if (functional.length + metier.length + technical.length + soft.length > 0) {
    // Titre section : orange sur fond sombre
    paras.push(ilomadSectionTitle("COMPÉTENCES", secondary, f, secondary))
    if (functional.length > 0) {
      paras.push(ilomadSubTitle("COMPÉTENCES FONCTIONNELLES", WHITE, f))
      paras.push(...functional.map((s) => skillBullet(s.name)))
    }
    if (metier.length > 0) {
      paras.push(ilomadSubTitle("DOMAINES MÉTIERS", WHITE, f))
      paras.push(...metier.map((s) => skillBullet(s.name)))
    }
    if (technical.length > 0) {
      paras.push(ilomadSubTitle("COMPÉTENCES TECHNIQUES", WHITE, f))
      paras.push(...technical.map((s) => skillBullet(s.name)))
    }
    if (soft.length > 0) {
      paras.push(ilomadSubTitle("SOFT SKILLS", WHITE, f))
      paras.push(...soft.map((s) => skillBullet(s.name)))
    }
  }

  // Contact (email/tél/adresse non affiché dans l'en-tête)
  if (cv.contact?.address || cv.contact?.linkedin) {
    paras.push(ilomadSectionTitle("CONTACT", secondary, f, secondary))
    if (cv.contact.address) {
      paras.push(new Paragraph({ children: [new TextRun({ text: cv.contact.address, size: 17, color: "CCCCCC", font: f })], spacing: { after: 50 } }))
    }
    if (cv.contact.linkedin) {
      paras.push(new Paragraph({ children: [new TextRun({ text: cv.contact.linkedin.replace(/https?:\/\//, ""), size: 17, color: "CCCCCC", font: f })], spacing: { after: 50 } }))
    }
  }

  paras.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }))
  return paras
}

// Colonne droite — fond blanc, PROFIL + EXPÉRIENCES
function ilomadRightColumn(cv: CvData, primary: string, secondary: string, f: string): Paragraph[] {
  const paras: Paragraph[] = []

  // PROFIL
  if (cv.contact?.profileText) {
    paras.push(ilomadSectionTitle("PROFIL", secondary, f))
    paras.push(new Paragraph({
      children: [new TextRun({ text: cv.contact.profileText, size: 19, font: f, color: "222222" })],
      spacing: { after: 120 },
    }))
  }

  // EXPÉRIENCES
  if (cv.experiences.length > 0) {
    paras.push(ilomadSectionTitle("EXPÉRIENCES PROFESSIONNELLES", secondary, f))
    for (const exp of cv.experiences) {
      const dateStr = exp.endDate ? `${exp.startDate} — ${exp.endDate}` : exp.isCurrent ? `${exp.startDate} — Présent` : exp.startDate
      const org = exp.client ? exp.client : exp.company

      // Org + date en orange (secondary)
      paras.push(new Paragraph({
        children: [
          new TextRun({ text: org, size: 19, bold: true, color: secondary, font: f }),
          new TextRun({ text: "  —  ", size: 17, color: "999999", font: f }),
          new TextRun({ text: dateStr, size: 18, bold: true, color: secondary, font: f }),
        ],
        spacing: { before: 200, after: 20 },
      }))
      // Titre du poste en gras foncé
      paras.push(new Paragraph({
        children: [new TextRun({ text: exp.title, size: 21, bold: true, font: f, color: primary })],
        spacing: { after: 30 },
      }))
      // Org secondaire (client ≠ employeur)
      if (exp.client && exp.company) {
        paras.push(new Paragraph({
          children: [new TextRun({ text: exp.company, size: 17, italics: true, font: f, color: "555555" })],
          spacing: { after: 30 },
        }))
      }
      // Contexte
      if (exp.context) {
        const lines = exp.context.split("\n").filter(Boolean)
        const ctx = lines.filter(l => !l.startsWith("Projet :") && !l.startsWith("Service :")).join(" ")
        if (ctx) paras.push(new Paragraph({ children: [new TextRun({ text: ctx, size: 18, font: f, color: "444444" })], spacing: { after: 40 } }))
      }
      // Réalisations
      if (exp.achievements) {
        const bullets = exp.achievements.split("\n").filter(l => l.trim())
        for (const b of bullets) paras.push(ilomadBullet(b.trim(), f, secondary, "333333"))
      }
      // Technologies
      if (exp.technologies) {
        paras.push(new Paragraph({
          children: [new TextRun({ text: exp.technologies, size: 16, font: f, color: "777777", italics: true })],
          spacing: { before: 30, after: 60 },
        }))
      }
    }
  }

  return paras
}

// Section bas de page — FORMATION | LANGUES sur fond légèrement coloré
function ilomadBottomSection(cv: CvData, primary: string, secondary: string, f: string): Table {
  const formParas: Paragraph[] = []
  const langParas: Paragraph[] = []

  formParas.push(ilomadSectionTitle("FORMATION", secondary, f))
  for (const edu of cv.educations) {
    const year = edu.endYear ?? edu.startYear
    formParas.push(new Paragraph({
      children: [
        ...(year ? [new TextRun({ text: `${year}  `, size: 18, bold: true, color: secondary, font: f })] : []),
        new TextRun({ text: edu.degree, size: 18, bold: true, font: f, color: primary }),
      ],
      spacing: { after: 20 },
    }))
    if (edu.school) {
      formParas.push(new Paragraph({
        children: [new TextRun({ text: edu.school, size: 17, italics: true, font: f, color: "555555" })],
        spacing: { after: 80 },
      }))
    }
  }

  langParas.push(ilomadSectionTitle("LANGUES", secondary, f))
  for (const lang of cv.languages) {
    const level = lang.levelLabel || lang.cefrLevel
    langParas.push(new Paragraph({
      children: [
        new TextRun({ text: lang.language, size: 19, bold: true, font: f, color: primary }),
        ...(level ? [new TextRun({ text: ` : ${level}`, size: 18, font: f, color: "555555" })] : []),
      ],
      spacing: { after: 70 },
    }))
  }

  const bottomBg = { type: ShadingType.CLEAR, color: "auto", fill: "F5F6F8" }
  const cellBorder = TABLE_BORDERS
  const cellMarg = { top: 160, bottom: 160, left: 240, right: 240 }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: [new TableRow({
      children: [
        new TableCell({ children: formParas, width: { size: 60, type: WidthType.PERCENTAGE }, shading: bottomBg, margins: cellMarg, borders: cellBorder }),
        new TableCell({ children: langParas, width: { size: 40, type: WidthType.PERCENTAGE }, shading: bottomBg, margins: cellMarg, borders: cellBorder }),
      ],
    })],
  })
}

function templateIlomad(cv: CvData, b: BrandingData, ss: SectionSettings | null, logo: Buffer | null, photo: Buffer | null, bs: BlockSettings | null): Document {
  const primary = hex(b.primaryColor)
  const secondary = resolveSecondary(b.secondaryColor)
  const f = b.fontFamily
  const children: DocChildren = []

  // 1. En-tête pleine largeur
  children.push(ilomadHeaderTable(cv, b, photo, logo, bs))

  // 2. Corps 2 colonnes : gauche foncé (compétences) | droite blanc (profil + expériences)
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: [new TableRow({
      children: [
        new TableCell({
          children: ilomadLeftColumn(cv, primary, secondary, f),
          width: { size: 33, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, color: "auto", fill: primary },
          margins: { top: 160, bottom: 160, left: 240, right: 240 },
          borders: TABLE_BORDERS,
        }),
        new TableCell({
          children: ilomadRightColumn(cv, primary, secondary, f),
          width: { size: 67, type: WidthType.PERCENTAGE },
          margins: { top: 160, bottom: 160, left: 280, right: 240 },
          borders: TABLE_BORDERS,
        }),
      ],
    })],
  }))

  // 3. Bas de page : Formation | Langues
  if (cv.educations.length > 0 || cv.languages.length > 0) {
    children.push(ilomadBottomSection(cv, primary, secondary, f))
  }

  return new Document({ sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }] })
}

// ─── Export principal ─────────────────────────────────────────────────────────
export async function generateCvDocx(
  cv: CvData,
  branding: BrandingData,
  templateId: number,
  sectionSettings?: SectionSettings | null,
  logoBuffer?: Buffer | null,
  photoBuffer?: Buffer | null,
  blockSettings?: BlockSettings | null
): Promise<Buffer> {
  const ss = sectionSettings ?? null
  const logo = logoBuffer ?? null
  const photo = photoBuffer ?? null
  const bs = blockSettings ?? null
  let doc: Document

  if (templateId === 2) doc = template2(cv, branding, ss, logo, photo, bs)
  else if (templateId === 3) doc = template3(cv, branding, ss, logo, photo, bs)
  else if (templateId === 4) doc = templateIlomad(cv, branding, ss, logo, photo, bs)
  else doc = template1(cv, branding, ss, logo, photo, bs)

  return Packer.toBuffer(doc) as Promise<Buffer>
}

export const TEMPLATES = [
  { id: 4, name: "ILOMAD", description: "2 colonnes — photo + logo en en-tête coloré, compétences à gauche, expériences à droite" },
  { id: 1, name: "Classique", description: "En-tête élégant, structure claire, séparateur coloré" },
  { id: 2, name: "Moderne", description: "Nom impactant, barre de couleur latérale, style contemporain" },
  { id: 3, name: "ATS Optimisé", description: "Structure simple, lecture machine prioritaire, compatible tous ATS" },
]
