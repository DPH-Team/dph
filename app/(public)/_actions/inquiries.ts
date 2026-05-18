"use server"

import { z } from "zod"

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
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000, "Message must be at most 2000 characters"),
  consent: z.string().optional(),
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

  if (data.type === "reservation" || data.type === "private-event") {
    if (!data.phone || data.phone.trim() === "") {
      fieldErrors.phone = ["Phone number is required for this inquiry type"]
    }
    if (!data.preferredDate || data.preferredDate.trim() === "") {
      fieldErrors.preferredDate = ["Preferred date is required"]
    }
  }

  if (data.type === "reservation") {
    if (!data.partySize || data.partySize.trim() === "") {
      fieldErrors.partySize = ["Party size is required for reservations"]
    } else {
      const size = parseInt(data.partySize, 10)
      if (isNaN(size) || size < 1 || size > 50) {
        fieldErrors.partySize = ["Party size must be between 1 and 50"]
      }
    }
    if (!data.preferredTime || data.preferredTime.trim() === "") {
      fieldErrors.preferredTime = ["Preferred time is required for reservations"]
    }
  }

  if (!data.consent || data.consent !== "true") {
    fieldErrors.consent = ["You must consent to be contacted"]
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors }
  }

  await new Promise((r) => setTimeout(r, 600))

  return {
    ok: true,
    message: "Thanks — we'll email you back within one business day.",
  }
}
