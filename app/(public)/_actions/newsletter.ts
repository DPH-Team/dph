"use server"

import { z } from "zod"

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

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
  const result = schema.safeParse(raw)

  if (!result.success) {
    return {
      ok: false,
      fieldErrors: result.error.flatten().fieldErrors as { email?: string[] },
    }
  }

  await new Promise((r) => setTimeout(r, 600))
  return { ok: true, message: "you're on the list — see you soon." }
}
