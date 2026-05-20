import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { CreamEditorialTemplate } from "@/lib/pdf/templates/CreamEditorialTemplate"
import { TealSidebarTemplate } from "@/lib/pdf/templates/TealSidebarTemplate"
import type { LetterTemplateProps } from "@/lib/pdf/templates/shared"
import { dataErrorMessage, getCurrentAppUser } from "@/lib/app-data"
import { supabaseAdmin } from "@/lib/supabase"

// @react-pdf/renderer needs the Node runtime — it uses fs/streams.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteParams {
  params: Promise<{ id: string }>
}

const ALLOWED_TEMPLATES = ["teal_sidebar", "cream_floral"] as const
type TemplateChoice = (typeof ALLOWED_TEMPLATES)[number]

interface DownloadBody {
  template?: string
  photoDataUrl?: string | null
  candidateName?: string
  candidatePhone?: string
  candidateLocation?: string
  candidateWebsite?: string
  candidateEmail?: string
  recipientAddress?: string
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024 // 5 MB cap on base64 input

function safeFilename(s: string): string {
  return s
    .replace(/[^a-z0-9\-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    || "cover-letter"
}

function validatePhotoDataUrl(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") return null
  if (!input.startsWith("data:image/")) return null
  if (input.length > MAX_PHOTO_BYTES) return null
  // Allow png, jpeg, webp
  if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(input)) return null
  return input
}

async function readBodyOrEmpty(req: NextRequest): Promise<DownloadBody> {
  try {
    if (req.method === "GET") return {}
    return (await req.json().catch(() => ({}))) as DownloadBody
  } catch {
    return {}
  }
}

async function buildPdf(
  template: TemplateChoice,
  args: LetterTemplateProps
): Promise<Buffer> {
  const element =
    template === "teal_sidebar"
      ? TealSidebarTemplate(args)
      : CreamEditorialTemplate(args)
  return renderToBuffer(element)
}

async function handle(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await getCurrentAppUser()
  if (!user) {
    return NextResponse.json({ error: error ?? "Authentication required" }, { status: 401 })
  }

  const { id } = await params

  const { data, error: fetchError } = await supabaseAdmin
    .from("generated_letters")
    .select(
      "id,user_id,final_cover_letter,job_title,company_name,created_at,generation_status,template_chosen"
    )
    .eq("id", id)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json(
      { error: dataErrorMessage(fetchError, "generated_letters") },
      { status: 500 }
    )
  }
  if (!data) {
    return NextResponse.json({ error: "Letter not found" }, { status: 404 })
  }
  if (data.user_id !== user.id) {
    return NextResponse.json({ error: "Not your letter" }, { status: 403 })
  }
  if (!data.final_cover_letter) {
    return NextResponse.json({ error: "Letter is not ready yet." }, { status: 409 })
  }

  const body = await readBodyOrEmpty(req)

  // Template: explicit body > previously chosen > default to teal_sidebar
  const requested = (body.template ?? data.template_chosen) as string | null
  const template: TemplateChoice = ALLOWED_TEMPLATES.includes(requested as TemplateChoice)
    ? (requested as TemplateChoice)
    : "teal_sidebar"

  const photoDataUrl = validatePhotoDataUrl(body.photoDataUrl)

  const candidateName =
    (body.candidateName?.trim() || user.name || user.email || "Your Name").slice(0, 80)
  const candidateEmail = (body.candidateEmail?.trim() || user.email || "").slice(0, 120)

  try {
    const buffer = await buildPdf(template, {
      letterBody: data.final_cover_letter,
      candidateName,
      candidateEmail,
      candidatePhone: body.candidatePhone?.trim() || undefined,
      candidateLocation: body.candidateLocation?.trim() || undefined,
      candidateWebsite: body.candidateWebsite?.trim() || undefined,
      photoDataUrl,
      jobTitle: data.job_title,
      companyName: data.company_name,
      recipientAddress: body.recipientAddress?.trim() || null,
      date: data.created_at,
    })

    const filename = safeFilename(
      [data.job_title || "cover-letter", data.company_name || ""]
        .filter(Boolean)
        .join("-")
        .toLowerCase()
    )

    // Record the user's template + photo choice so subsequent downloads
    // remember them. Photo itself is NEVER stored — only the boolean flag.
    await supabaseAdmin
      .from("generated_letters")
      .update({
        template_chosen: template,
        photo_uploaded: !!photoDataUrl,
      })
      .eq("id", id)
      .then(
        () => undefined,
        () => undefined
      )

    return new Response(buffer as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (err) {
    console.error("[/api/letters/:id/pdf] render failed:", err)
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 })
  }
}

export async function GET(req: NextRequest, ctx: RouteParams) {
  return handle(req, ctx)
}

export async function POST(req: NextRequest, ctx: RouteParams) {
  return handle(req, ctx)
}
