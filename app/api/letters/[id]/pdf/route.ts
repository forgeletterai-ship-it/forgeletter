import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { LetterTemplate } from "@/lib/pdf/LetterTemplate"
import { dataErrorMessage, getCurrentAppUser } from "@/lib/app-data"
import { supabaseAdmin } from "@/lib/supabase"

// @react-pdf/renderer needs the Node runtime — it uses fs/streams.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteParams {
  params: Promise<{ id: string }>
}

function safeFilename(s: string): string {
  return s.replace(/[^a-z0-9\-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60)
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { user, error } = await getCurrentAppUser()
  if (!user) {
    return NextResponse.json({ error: error ?? "Authentication required" }, { status: 401 })
  }

  const { id } = await params

  const { data, error: fetchError } = await supabaseAdmin
    .from("generated_letters")
    .select("id,user_id,final_cover_letter,job_title,company_name,created_at,generation_status")
    .eq("id", id)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: dataErrorMessage(fetchError, "generated_letters") }, { status: 500 })
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

  try {
    const buffer = await renderToBuffer(
      LetterTemplate({
        letterBody: data.final_cover_letter,
        jobTitle: data.job_title,
        companyName: data.company_name,
        candidateName: user.name,
        date: data.created_at,
      })
    )

    const filename = safeFilename(
      [data.job_title || "cover-letter", data.company_name || ""]
        .filter(Boolean)
        .join("-")
        .toLowerCase() || "cover-letter"
    )

    // Mark the letter as having had a template chosen (for future analytics).
    await supabaseAdmin
      .from("generated_letters")
      .update({ template_chosen: "teal_sidebar" })
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
