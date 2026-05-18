"use server"

import { z } from "zod"

export type CareersState =
  | { ok: true; message: string }
  | { ok: false; fieldErrors: Partial<Record<string, string[]>>; message?: string }
  | null

const careersSchema = z.object({
  positionId: z.string().min(1, "Please select a position"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(1, "Phone number is required"),
  link: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  availability: z
    .string()
    .min(5, "Please describe your availability (at least 5 characters)")
    .max(500, "Availability must be at most 500 characters"),
  coverLetter: z.string().max(2000, "Cover letter must be at most 2000 characters").optional(),
  consent: z.string().optional(),
})

export async function submitCareerApplication(
  prevState: CareersState,
  formData: FormData,
): Promise<CareersState> {
  const raw = Object.fromEntries(formData.entries())

  const parsed = careersSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<Record<string, string[]>>,
    }
  }

  const data = parsed.data
  const fieldErrors: Partial<Record<string, string[]>> = {}

  if (!data.consent || data.consent !== "true") {
    fieldErrors.consent = ["You must consent to be contacted"]
  }

  const resumeFile = formData.get("resume")
  if (!resumeFile || !(resumeFile instanceof File) || resumeFile.size === 0) {
    fieldErrors.resume = ["Please attach your resume"]
  } else if (resumeFile.size > 5 * 1024 * 1024) {
    fieldErrors.resume = ["Resume must be smaller than 5 MB"]
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors }
  }

  await new Promise((r) => setTimeout(r, 600))

  return {
    ok: true,
    message: "Thanks for applying. We'll be in touch if there's a match.",
  }
}
