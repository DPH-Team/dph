"use server"

import { z } from "zod"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { inquiries } from "@/lib/db/schema"
import { formTypeToDbType } from "@/lib/validators/inquiries"
import { verifyTurnstile } from "@/lib/security/turnstile"
import { sendEmail } from "@/lib/email/send"
import { InquiryStaffNotification } from "@/lib/email/templates/InquiryStaffNotification"
import { InquiryCustomerReply } from "@/lib/email/templates/InquiryCustomerReply"
import * as React from "react"

export type InquiryState =
  | { ok: true; message: string }
  | { ok: false; fieldErrors: Partial<Record<string, string[]>>; message?: string }
  | null

const baseSchema = z.object({
  type: z.enum(["reservation", "private-event", "press", "general"]),
  name: z.string().min(2, "Name must be at least 2 characters").max(80, "Name must be at most 80 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  partySize: z.string().optional(),
  seatingPreference: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000, "Message must be at most 2000 characters"),
})

export async function submitInquiry(
  prevState: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  const raw = Object.fromEntries(formData.entries())

  const base = baseSchema.safeParse(raw)
  if (!base.success) {
    return {
      ok: false,
      fieldErrors: base.error.flatten().fieldErrors as Partial<Record<string, string[]>>,
    }
  }

  const data = base.data
  const fieldErrors: Partial<Record<string, string[]>> = {}

  // Phone is required for every inquiry type
  if (!data.phone || data.phone.trim() === "") {
    fieldErrors.phone = ["Phone number is required"]
  }

  if (data.type === "reservation" || data.type === "private-event") {
    if (!data.preferredDate || data.preferredDate.trim() === "") {
      fieldErrors.preferredDate = ["Preferred date is required"]
    }
    if (!data.partySize || data.partySize.trim() === "") {
      fieldErrors.partySize = ["Party size is required for reservations"]
    } else {
      const size = parseInt(data.partySize, 10)
      if (isNaN(size) || size < 1 || size > 200) {
        fieldErrors.partySize = ["Party size must be between 1 and 200"]
      }
    }
    if (!data.seatingPreference || data.seatingPreference.trim() === "") {
      fieldErrors.seatingPreference = ["Please choose a seating preference"]
    }
  }

  if (data.type === "reservation") {
    if (!data.preferredTime || data.preferredTime.trim() === "") {
      fieldErrors.preferredTime = ["Preferred time is required for reservations"]
    }
  }

  // Validate seating preference value when provided (any type)
  if (data.seatingPreference && data.seatingPreference.trim() !== "") {
    if (!["high_top", "low_top"].includes(data.seatingPreference)) {
      fieldErrors.seatingPreference = ["Invalid seating preference"]
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors }
  }

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
      fieldErrors: {},
      message: "Bot verification failed. Please try again.",
    }
  }

  // Map form wire value to DB enum value ('private-event' → 'private_event').
  const dbType = formTypeToDbType(data.type)

  // ── DB insert — source of truth ──────────────────────────────────────────────
  try {
    await db.insert(inquiries).values({
      type: dbType,
      name: data.name,
      email: data.email,
      phone: data.phone?.trim() || null,
      partySize: data.partySize ? Number(data.partySize) : null,
      seatingPreference: data.seatingPreference && ['high_top', 'low_top'].includes(data.seatingPreference)
        ? (data.seatingPreference as 'high_top' | 'low_top')
        : null,
      preferredDate: data.preferredDate?.trim() || null,
      preferredTime: data.preferredTime?.trim() || null,
      message: data.message,
      consent: true,
      // status defaults to 'pending' via DB default — not passed explicitly.
    })
  } catch (err) {
    console.error("[inquiries] Failed to insert inquiry:", err)
    return {
      ok: false,
      fieldErrors: {},
      message: "Something went wrong. Please try again.",
    }
  }

  // ── Emails — fire-and-forget, failure cannot fail the submit ─────────────────
  void sendEmail({
    to: process.env.RESEND_REPLY_TO ?? process.env.RESEND_FROM_EMAIL ?? "info@districtpourhaus.com",
    subject: `New ${dbType.replace("_", " ")} inquiry from ${data.name}`,
    react: React.createElement(InquiryStaffNotification, {
      name: data.name,
      email: data.email,
      phone: data.phone?.trim() || null,
      type: dbType,
      partySize: data.partySize ? Number(data.partySize) : null,
      preferredDate: data.preferredDate?.trim() || null,
      preferredTime: data.preferredTime?.trim() || null,
      message: data.message,
    }),
    replyTo: data.email,
    template: "inquiry-staff-notification",
  })

  void sendEmail({
    to: data.email,
    subject: "We received your inquiry — District Pour Haus",
    react: React.createElement(InquiryCustomerReply, {
      name: data.name,
      type: dbType,
    }),
    template: "inquiry-customer-reply",
  })

  return {
    ok: true,
    message: "Thanks — we'll email you back within one business day.",
  }
}
