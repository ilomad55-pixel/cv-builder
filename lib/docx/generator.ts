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

// ─── Template 1 : Classique ──────────────────────────────────────────────────
function template1(cv: CvData, b: BrandingData): Document {
  const c = hex(b.primaryColor)
  const f = b.fontFamily
  const children: Paragraph[] = []

  // En-tête
  children.push(new Paragraph({
    children: [new TextRun({ text: fullName(cv), size: 52, bold: true, color: c, font: f })],
    spacing: { after: 60 },
  }))

  if (cv.contact?.headline) {
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.contact.headline, size: 24, font: f, color: "444444", italics: true })],
      spacing: { after: 80 },
    }))
  }

  const contact = contactLine(cv)
  if (contact) {
    children.push(new Paragraph({
      children: [new TextRun({ text: contact, size: 20, font: f, color: "555555" })],
      spacing: { after: 240 },
    }))
  }

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

  // Compétences
  const technical = cv.skills.filter((s) => s.category === "technical" || s.category === "tool")
  if (technical.length > 0) {
    children.push(sectionTitle("COMPÉTENCES TECHNIQUES", c, f))
    children.push(new Paragraph({
      children: [new TextRun({ text: technical.map((s) => s.name).join(" · "), size: 20, font: f })],
      spacing: { after: 180 },
    }))
    const soft = cv.skills.filter((s) => s.category === "soft")
    if (soft.length > 0) {
      children.push(labeledLine("Soft skills", soft.map((s) => s.name).join(", "), f))
    }
    const methods = cv.skills.filter((s) => s.category === "methodology")
    if (methods.length > 0) {
      children.push(labeledLine("Méthodes", methods.map((s) => s.name).join(", "), f))
    }
  }

  // Formation
  if (cv.educations.length > 0) {
    children.push(sectionTitle("FORMATION", c, f))
    for (const edu of cv.educations) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: edu.degree, size: 22, bold: true, font: f }),
          new TextRun({ text: edu.fieldOfStudy ? ` — ${edu.fieldOfStudy}` : "", size: 20, font: f }),
          new TextRun({ text: `\t${edu.endYear ?? ""}`, size: 20, font: f, color: "666666" }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 140, after: 30 },
      }))
      children.push(new Paragraph({
        children: [new TextRun({ text: edu.school, size: 20, font: f, color: c, italics: true })],
        spacing: { after: edu.honors ? 30 : 80 },
      }))
      if (edu.honors) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `Mention : ${edu.honors}`, size: 19, font: f, color: "666666" })],
          spacing: { after: 80 },
        }))
      }
    }
  }

  // Langues
  if (cv.languages.length > 0) {
    children.push(sectionTitle("LANGUES", c, f))
    children.push(new Paragraph({
      children: cv.languages.flatMap((l, i) => [
        ...(i > 0 ? [new TextRun({ text: "   ·   ", size: 20, font: f, color: "AAAAAA" })] : []),
        new TextRun({ text: l.language, size: 20, bold: true, font: f }),
        new TextRun({ text: l.cefrLevel ? ` (${l.cefrLevel})` : l.levelLabel ? ` — ${l.levelLabel}` : "", size: 20, font: f, color: "777777" }),
      ]),
      spacing: { after: 180 },
    }))
  }

  // Certifications
  if (cv.certifications.length > 0) {
    children.push(sectionTitle("CERTIFICATIONS", c, f))
    for (const cert of cv.certifications) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: cert.name, size: 20, bold: true, font: f }),
          new TextRun({ text: cert.issuer ? ` — ${cert.issuer}` : "", size: 20, font: f, color: "666666" }),
          new TextRun({ text: cert.issueDate ? `   ${cert.issueDate}` : "", size: 19, font: f, color: "999999" }),
        ],
        spacing: { before: 80, after: 40 },
      }))
    }
  }

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

  children.push(new Paragraph({
    children: [new TextRun({ text: fullName(cv).toUpperCase(), size: 64, bold: true, color: c, font: f })],
    spacing: { after: 60 },
  }))

  if (cv.contact?.headline) {
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.contact.headline, size: 24, font: f, italics: true, color: "555555" })],
      spacing: { after: 100 },
    }))
  }

  children.push(new Paragraph({
    border: { bottom: { style: BorderStyle.THICK, size: 16, color: c } },
    spacing: { after: 160 },
  }))

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

  if (cv.contact?.profileText) {
    children.push(sectionTitleModerne("PROFIL", c, f))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.contact.profileText, size: 20, font: f })],
      spacing: { after: 280 },
    }))
  }

  if (cv.experiences.length > 0) {
    children.push(sectionTitleModerne("EXPÉRIENCES", c, f))
    for (const exp of cv.experiences) {
      children.push(...expBlock2(exp, c, f))
    }
  }

  const technical = cv.skills.filter((s) => s.category === "technical" || s.category === "tool")
  if (technical.length > 0) {
    children.push(sectionTitleModerne("COMPÉTENCES", c, f))
    children.push(new Paragraph({
      children: [new TextRun({ text: technical.map((s) => s.name).join("  ·  "), size: 20, font: f })],
      spacing: { after: 80 },
    }))
    const soft = cv.skills.filter((s) => s.category === "soft")
    if (soft.length > 0) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: "Soft : ", size: 19, bold: true, color: c, font: f }),
          new TextRun({ text: soft.map((s) => s.name).join(", "), size: 19, font: f }),
        ],
        spacing: { after: 80 },
      }))
    }
  }

  if (cv.educations.length > 0) {
    children.push(sectionTitleModerne("FORMATION", c, f))
    for (const edu of cv.educations) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: edu.degree, size: 21, bold: true, font: f }),
          new TextRun({ text: edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : "", size: 20, font: f }),
        ],
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: c, space: 8 } },
        indent: { left: 120 },
        spacing: { before: 160, after: 40 },
      }))
      children.push(new Paragraph({
        children: [new TextRun({ text: `${edu.school}${edu.endYear ? ` · ${edu.endYear}` : ""}`, size: 20, font: f, color: c })],
        indent: { left: 120 },
        spacing: { after: 80 },
      }))
    }
  }

  if (cv.languages.length > 0) {
    children.push(sectionTitleModerne("LANGUES", c, f))
    children.push(new Paragraph({
      children: cv.languages.flatMap((l, i) => [
        ...(i > 0 ? [new TextRun({ text: "  ·  ", size: 20, color: c, font: f })] : []),
        new TextRun({ text: `${l.language}${l.cefrLevel ? ` (${l.cefrLevel})` : ""}`, size: 20, font: f }),
      ]),
      spacing: { after: 160 },
    }))
  }

  if (cv.certifications.length > 0) {
    children.push(sectionTitleModerne("CERTIFICATIONS", c, f))
    for (const cert of cv.certifications) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: cert.name, size: 20, bold: true, font: f }),
          new TextRun({ text: cert.issuer ? ` — ${cert.issuer}` : "", size: 20, font: f, color: "666666" }),
        ],
        spacing: { before: 60, after: 40 },
      }))
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

  children.push(new Paragraph({
    children: [new TextRun({ text: fullName(cv), size: 44, bold: true, font: f })],
    spacing: { after: 60 },
  }))
  if (cv.contact?.headline) {
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.contact.headline, size: 22, font: f })],
      spacing: { after: 60 },
    }))
  }
  const contact = contactLine(cv)
  if (contact) {
    children.push(new Paragraph({
      children: [new TextRun({ text: contact, size: 20, font: f })],
      spacing: { after: 200 },
    }))
  }

  if (cv.contact?.profileText) {
    children.push(atsSectionTitle("Profil professionnel", f))
    children.push(new Paragraph({
      children: [new TextRun({ text: cv.contact.profileText, size: 20, font: f })],
      spacing: { after: 200 },
    }))
  }

  const technical = cv.skills.filter((s) => s.category === "technical" || s.category === "tool")
  if (technical.length > 0) {
    children.push(atsSectionTitle("Compétences techniques", f))
    children.push(new Paragraph({
      children: [new TextRun({ text: technical.map((s) => s.name).join(", "), size: 20, font: f })],
      spacing: { after: 60 },
    }))
    const soft = cv.skills.filter((s) => s.category === "soft")
    if (soft.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `Soft skills : ${soft.map((s) => s.name).join(", ")}`, size: 20, font: f })],
        spacing: { after: 200 },
      }))
    }
  }

  if (cv.experiences.length > 0) {
    children.push(atsSectionTitle("Expériences professionnelles", f))
    for (const exp of cv.experiences) {
      children.push(...expBlock3(exp, f))
    }
  }

  if (cv.educations.length > 0) {
    children.push(atsSectionTitle("Formation", f))
    for (const edu of cv.educations) {
      children.push(new Paragraph({
        children: [new TextRun({ text: edu.degree, size: 22, bold: true, font: f })],
        spacing: { before: 100, after: 30 },
      }))
      children.push(new Paragraph({
        children: [new TextRun({
          text: `${edu.school}${edu.endYear ? ` | ${edu.endYear}` : ""}${edu.honors ? ` | ${edu.honors}` : ""}`,
          size: 20, font: f,
        })],
        spacing: { after: 80 },
      }))
    }
  }

  if (cv.languages.length > 0) {
    children.push(atsSectionTitle("Langues", f))
    children.push(new Paragraph({
      children: [new TextRun({
        text: cv.languages.map((l) => `${l.language}${l.cefrLevel ? ` (${l.cefrLevel})` : ""}`).join(" | "),
        size: 20, font: f,
      })],
      spacing: { after: 200 },
    }))
  }

  if (cv.certifications.length > 0) {
    children.push(atsSectionTitle("Certifications", f))
    for (const cert of cv.certifications) {
      children.push(new Paragraph({
        children: [new TextRun({
          text: `${cert.name}${cert.issuer ? ` — ${cert.issuer}` : ""}${cert.issueDate ? ` (${cert.issueDate})` : ""}`,
          size: 20, font: f,
        })],
        spacing: { before: 60, after: 40 },
      }))
    }
  }

  return new Document({
    sections: [{ properties: { page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } }, children }],
  })
}

// ─── Blocs expérience ────────────────────────────────────────────────────────
function expBlock1(exp: CvData["experiences"][0], c: string, f: string): Paragraph[] {
  const paras: Paragraph[] = []
  const dateStr = exp.endDate ? `${exp.startDate} — ${exp.endDate}` : exp.isCurrent ? `${exp.startDate} — Présent` : exp.startDate
  paras.push(new Paragraph({
    children: [
      new TextRun({ text: exp.title, size: 22, bold: true, font: f }),
      new TextRun({ text: `\t${dateStr}`, size: 20, font: f, color: "666666" }),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    spacing: { before: 200, after: 40 },
  }))
  const companyStr = exp.client ? `${exp.company} (Client : ${exp.client})` : exp.company
  paras.push(new Paragraph({
    children: [new TextRun({ text: companyStr, size: 20, font: f, color: c, italics: true })],
    spacing: { after: 60 },
  }))
  if (exp.context) paras.push(labeledLine("Contexte", exp.context, f))
  if (exp.achievements) paras.push(labeledLine("Réalisations", exp.achievements, f))
  if (exp.technologies) paras.push(labeledLine("Technologies", exp.technologies, f))
  if (exp.methods) paras.push(labeledLine("Méthodes", exp.methods, f))
  return paras
}

function expBlock2(exp: CvData["experiences"][0], c: string, f: string): Paragraph[] {
  const paras: Paragraph[] = []
  const companyStr = exp.client ? `${exp.company} · Client : ${exp.client}` : exp.company
  const dateStr = exp.endDate ? `${exp.startDate} — ${exp.endDate}` : exp.isCurrent ? `${exp.startDate} — Présent` : exp.startDate
  paras.push(new Paragraph({
    children: [
      new TextRun({ text: `${exp.title}  `, size: 22, bold: true, font: f }),
      new TextRun({ text: companyStr, size: 21, font: f, color: c }),
    ],
    spacing: { before: 240, after: 40 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: c, space: 8 } },
    indent: { left: 120 },
  }))
  paras.push(new Paragraph({
    children: [new TextRun({ text: dateStr, size: 19, font: f, color: "888888" })],
    indent: { left: 120 },
    spacing: { after: 60 },
  }))
  if (exp.context) paras.push(new Paragraph({ children: [new TextRun({ text: exp.context, size: 19, font: f })], indent: { left: 120 }, spacing: { after: 40 } }))
  if (exp.achievements) paras.push(new Paragraph({ children: [new TextRun({ text: exp.achievements, size: 19, font: f })], indent: { left: 120 }, spacing: { after: 40 } }))
  if (exp.technologies) paras.push(new Paragraph({
    children: [new TextRun({ text: "Stack : ", size: 18, bold: true, font: f, color: c }), new TextRun({ text: exp.technologies, size: 18, font: f })],
    indent: { left: 120 }, spacing: { after: 60 },
  }))
  return paras
}

function expBlock3(exp: CvData["experiences"][0], f: string): Paragraph[] {
  const paras: Paragraph[] = []
  const dateStr = exp.endDate ? `${exp.startDate} - ${exp.endDate}` : exp.isCurrent ? `${exp.startDate} - Présent` : exp.startDate
  const companyStr = exp.client ? `${exp.company} (Client : ${exp.client})` : exp.company
  paras.push(new Paragraph({ children: [new TextRun({ text: exp.title, size: 22, bold: true, font: f })], spacing: { before: 180, after: 30 } }))
  paras.push(new Paragraph({ children: [new TextRun({ text: `${companyStr} | ${dateStr}`, size: 20, font: f })], spacing: { after: 60 } }))
  if (exp.context) paras.push(new Paragraph({ children: [new TextRun({ text: exp.context, size: 19, font: f })], spacing: { after: 40 } }))
  if (exp.achievements) paras.push(new Paragraph({ children: [new TextRun({ text: exp.achievements, size: 19, font: f })], spacing: { after: 40 } }))
  if (exp.technologies) paras.push(new Paragraph({ children: [new TextRun({ text: `Compétences : ${exp.technologies}`, size: 19, font: f })], spacing: { after: 60 } }))
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
    children: [new TextRun({ text, size: 22, bold: true, color: c, font: f, underline: { type: UnderlineType.SINGLE, color: c } })],
    spacing: { before: 320, after: 120 },
  })
}

function atsSectionTitle(text: string, f: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 24, bold: true, font: f })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" } },
    spacing: { before: 200, after: 100 },
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
