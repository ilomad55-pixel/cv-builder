import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  BorderStyle,
  UnderlineType,
  TabStopType,
  TabStopPosition,
} from "docx"

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
  fontFamily: string
}

export type SectionSettings = Record<string, { visible: boolean; order: number }>

// ─── Helpers de base ──────────────────────────────────────────────────────────
function hex(color: string): string {
  return color.replace("#", "").toUpperCase()
}

function fullName(cv: CvData): string {
  return [cv.contact?.firstName, cv.contact?.lastName].filter(Boolean).join(" ") || "Nom du candidat"
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
function logoParagraph(logoBuffer: Buffer): Paragraph {
  return new Paragraph({
    children: [
      new ImageRun({
        data: logoBuffer,
        transformation: { width: 130, height: 45 },
      }),
    ],
    alignment: AlignmentType.RIGHT,
    spacing: { after: 100 },
  })
}

// ─── Builders de sections partagés ───────────────────────────────────────────
type SectionMap = Map<string, () => Paragraph[]>

function buildSections1(cv: CvData, ss: SectionSettings | null, c: string, f: string): SectionMap {
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

function buildSections2(cv: CvData, ss: SectionSettings | null, c: string, f: string): SectionMap {
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

function buildSections3(cv: CvData, ss: SectionSettings | null, f: string): SectionMap {
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
function template1(cv: CvData, b: BrandingData, ss: SectionSettings | null, logo: Buffer | null): Document {
  const c = hex(b.primaryColor)
  const f = b.fontFamily
  const children: Paragraph[] = []

  if (logo) children.push(logoParagraph(logo))

  children.push(new Paragraph({ children: [new TextRun({ text: fullName(cv), size: 52, bold: true, color: c, font: f })], spacing: { after: 60 } }))
  if (cv.contact?.headline) children.push(new Paragraph({ children: [new TextRun({ text: cv.contact.headline, size: 24, font: f, color: "444444", italics: true })], spacing: { after: 80 } }))
  const cl = contactLine(cv)
  if (cl) children.push(new Paragraph({ children: [new TextRun({ text: cl, size: 20, font: f, color: "555555" })], spacing: { after: 240 } }))
  children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: c } }, spacing: { after: 240 } }))

  const sections = buildSections1(cv, ss, c, f)
  for (const id of orderedSectionIds(ss)) {
    children.push(...(sections.get(id)?.() ?? []))
  }

  children.push(new Paragraph({ children: [new TextRun({ text: b.companyName, size: 16, color: "AAAAAA", font: f })], alignment: AlignmentType.RIGHT, spacing: { before: 400 } }))

  return new Document({ sections: [{ properties: { page: { margin: { top: 860, right: 860, bottom: 860, left: 860 } } }, children }] })
}

function template2(cv: CvData, b: BrandingData, ss: SectionSettings | null, logo: Buffer | null): Document {
  const c = hex(b.primaryColor)
  const f = b.fontFamily
  const children: Paragraph[] = []

  if (logo) children.push(logoParagraph(logo))

  children.push(new Paragraph({ children: [new TextRun({ text: fullName(cv).toUpperCase(), size: 64, bold: true, color: c, font: f })], spacing: { after: 60 } }))
  if (cv.contact?.headline) children.push(new Paragraph({ children: [new TextRun({ text: cv.contact.headline, size: 24, font: f, italics: true, color: "555555" })], spacing: { after: 100 } }))
  children.push(new Paragraph({ border: { bottom: { style: BorderStyle.THICK, size: 16, color: c } }, spacing: { after: 160 } }))
  const contactParts = [cv.contact?.email, cv.contact?.phone, cv.contact?.address].filter(Boolean)
  if (contactParts.length > 0) {
    children.push(new Paragraph({
      children: contactParts.flatMap((part, i) => [...(i > 0 ? [new TextRun({ text: "  ·  ", size: 20, color: c, font: f, bold: true })] : []), new TextRun({ text: part!, size: 20, font: f })]),
      spacing: { after: 320 },
    }))
  }

  const sections = buildSections2(cv, ss, c, f)
  for (const id of orderedSectionIds(ss)) {
    children.push(...(sections.get(id)?.() ?? []))
  }

  children.push(new Paragraph({ children: [new TextRun({ text: b.companyName, size: 16, color: "AAAAAA", font: f })], alignment: AlignmentType.RIGHT, spacing: { before: 400 } }))

  return new Document({ sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }] })
}

function template3(cv: CvData, b: BrandingData, ss: SectionSettings | null, logo: Buffer | null): Document {
  const f = b.fontFamily
  const children: Paragraph[] = []

  if (logo) children.push(logoParagraph(logo))

  children.push(new Paragraph({ children: [new TextRun({ text: fullName(cv), size: 44, bold: true, font: f })], spacing: { after: 60 } }))
  if (cv.contact?.headline) children.push(new Paragraph({ children: [new TextRun({ text: cv.contact.headline, size: 22, font: f })], spacing: { after: 60 } }))
  const cl = contactLine(cv)
  if (cl) children.push(new Paragraph({ children: [new TextRun({ text: cl, size: 20, font: f })], spacing: { after: 200 } }))

  const sections = buildSections3(cv, ss, f)
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
  if (exp.context) paras.push(labeledLine("Contexte", exp.context, f))
  if (exp.achievements) paras.push(labeledLine("Réalisations", exp.achievements, f))
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
  if (exp.context) paras.push(new Paragraph({ children: [new TextRun({ text: exp.context, size: 19, font: f })], indent: { left: 120 }, spacing: { after: 40 } }))
  if (exp.achievements) paras.push(new Paragraph({ children: [new TextRun({ text: exp.achievements, size: 19, font: f })], indent: { left: 120 }, spacing: { after: 40 } }))
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
  if (exp.context) paras.push(new Paragraph({ children: [new TextRun({ text: exp.context, size: 19, font: f })], spacing: { after: 40 } }))
  if (exp.achievements) paras.push(new Paragraph({ children: [new TextRun({ text: exp.achievements, size: 19, font: f })], spacing: { after: 40 } }))
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

// ─── Export principal ─────────────────────────────────────────────────────────
export async function generateCvDocx(
  cv: CvData,
  branding: BrandingData,
  templateId: number,
  sectionSettings?: SectionSettings | null,
  logoBuffer?: Buffer | null
): Promise<Buffer> {
  const ss = sectionSettings ?? null
  const logo = logoBuffer ?? null
  let doc: Document

  if (templateId === 2) doc = template2(cv, branding, ss, logo)
  else if (templateId === 3) doc = template3(cv, branding, ss, logo)
  else doc = template1(cv, branding, ss, logo)

  return Packer.toBuffer(doc) as Promise<Buffer>
}

export const TEMPLATES = [
  { id: 1, name: "Classique", description: "En-tête élégant, structure claire, séparateur coloré" },
  { id: 2, name: "Moderne", description: "Nom impactant, barre de couleur latérale, style contemporain" },
  { id: 3, name: "ATS Optimisé", description: "Structure simple, lecture machine prioritaire, compatible tous ATS" },
]
