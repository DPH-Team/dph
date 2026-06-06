"use server"

import { headers } from "next/headers"
import { subscribeNewsletterSchema } from "@/lib/validators/newsletter"
import { verifyTurnstile } from "@/lib/security/turnstile"
import { sendEmail } from "@/lib/email/send"
import {
  getSubscriberByEmail,
  createPendingSubscriber,
  reissueConfirm,
  reopenAsPending,
} from "@/lib/db/queries/subscribers"
import { NewsletterConfirm } from "@/lib/email/templates/NewsletterConfirm"
import * as React from "react"

export type NewsletterState = {
  ok: boolean
  message?: string
  fieldErrors?: { email?: string[] }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://districtpourhaus.com").replace(/\/$/, "")
}

function sendConfirm(
  email: string,
  confirmToken: string,
  unsubscribeToken: string,
  siteUrl: string,
): void {
  const confirmUrl = `${siteUrl}/newsletter/confirm?token=${confirmToken}`
  const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${unsubscribeToken}`

  // Fire-and-forget. sendEmail never throws; failure must not roll back the DB
  // row or flip the action to an error state.
  void sendEmail({
    to: email,
    subject: "Confirm your subscription to District Pour Haus",
    react: React.createElement(NewsletterConfirm, { confirmUrl, unsubscribeUrl, siteUrl }),
    template: "newsletter-confirm",
  })
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function subscribeToNewsletter(
  _prevState: NewsletterState,
  formData: FormData,
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

  // ── Double opt-in DB logic ───────────────────────────────────────────────────
  const siteUrl = buildSiteUrl()

  const existing = await getSubscriberByEmail(email)

  // (new) No subscriber record at all — create pending and send confirm.
  if (!existing) {
    let row
    try {
      const token = crypto.randomUUID()
      row = await createPendingSubscriber({ email, source: "public_form", confirmToken: token })
    } catch (err) {
      // Race condition: a concurrent request already inserted this email.
      // Re-fetch and fall through to the pending-resend branch below.
      const isUniqueViolation =
        err instanceof Error &&
        (err.message.includes("unique") || err.message.includes("duplicate"))

      if (isUniqueViolation) {
        const refetched = await getSubscriberByEmail(email)
        if (refetched && !refetched.confirmedAt) {
          const token = crypto.randomUUID()
          await reissueConfirm(refetched.id, token)
          sendConfirm(email, token, refetched.unsubscribeToken, siteUrl)
          return { ok: true, message: "Check your inbox to confirm your subscription." }
        }
        // Already confirmed in the race window — treat as active.
        if (refetched?.confirmedAt && !refetched.unsubscribedAt) {
          return { ok: true, message: "You’re already on the list — see you at the haus." }
        }
      }

      console.error("[newsletter] Failed to create subscriber:", err)
      return { ok: false, message: "Something went wrong. Please try again." }
    }

    sendConfirm(email, row.confirmToken!, row.unsubscribeToken, siteUrl)
    return { ok: true, message: "Check your inbox to confirm your subscription." }
  }

  // (c) Previously unsubscribed — reopen as pending and re-confirm.
  if (existing.unsubscribedAt) {
    const token = crypto.randomUUID()
    await reopenAsPending(existing.id, token)
    sendConfirm(email, token, existing.unsubscribeToken, siteUrl)
    return { ok: true, message: "Check your inbox to confirm your subscription." }
  }

  // (a) Pending (not yet confirmed) — resend confirm with a fresh token.
  if (!existing.confirmedAt) {
    const token = crypto.randomUUID()
    await reissueConfirm(existing.id, token)
    sendConfirm(email, token, existing.unsubscribeToken, siteUrl)
    return { ok: true, message: "Check your inbox to confirm your subscription." }
  }

  // (b) Already confirmed and active.
  return { ok: true, message: "You’re already on the list — see you at the haus." }
}
