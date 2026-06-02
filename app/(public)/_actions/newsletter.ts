"use server"

import { headers } from "next/headers"
import { db } from "@/lib/db"
import { subscribers } from "@/lib/db/schema"
import { subscribeNewsletterSchema } from "@/lib/validators/newsletter"
import { verifyTurnstile } from "@/lib/security/turnstile"

export type NewsletterState = {
  ok: boolean
  message?: string
  fieldErrors?: { email?: string[] }
}

export async function subscribeToNewsletter(
  _prevState: NewsletterState,
  formData: FormData
): Promise<NewsletterState> {
  const raw = { email: formData.get("email") }

  const result = subscribeNewsletterSchema.safeParse(raw)
  if (!result.success) {
    return {
      ok: false,
      fieldErrors: result.error.flatten().fieldErrors as { email?: string[] },
    }
  }

  const { email } = result.data

  // ── Turnstile verification ───────────────────────────────────────────────────
  const turnstileToken = formData.get("cf-turnstile-response")
  const headersList = await headers()
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    undefined

  const turnstileOk = await verifyTurnstile(
    typeof turnstileToken === "string" ? turnstileToken : null,
    ip,
  )
  if (!turnstileOk) {
    return {
      ok: false,
      message: "Bot verification failed. Please try again.",
    }
  }

  // ── DB insert — unique-violation = already subscribed = success ──────────────
  try {
    await db
      .insert(subscribers)
      .values({ email, source: "public_form" })
      .onConflictDoNothing()
  } catch (err) {
    console.error("[newsletter] Failed to insert subscriber:", err)
    return {
      ok: false,
      message: "Something went wrong. Please try again.",
    }
  }

  return { ok: true, message: "you're on the list — see you soon." }
}
