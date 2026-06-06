import type { Metadata } from "next"
import Link from "next/link"
import { MailX, XCircle } from "lucide-react"

import { unsubscribeByToken } from "@/lib/db/queries/subscribers"
import { audit } from "@/lib/audit"
import { Wordmark } from "@/components/marketing/Wordmark"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Unsubscribed | District Pour Haus",
  robots: { index: false, follow: false },
}

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { token } = await searchParams
  const tokenValue = Array.isArray(token) ? token[0] : token

  if (!tokenValue || tokenValue.trim() === "") {
    return <InvalidState />
  }

  let res: Awaited<ReturnType<typeof unsubscribeByToken>>
  try {
    res = await unsubscribeByToken(tokenValue)
  } catch {
    return <InvalidState />
  }

  if (res.status === "ok") {
    void audit(
      "subscriber.unsubscribe",
      "subscriber",
      res.id,
      { source: "public" },
    ).catch(() => {})

    return <SuccessState />
  }

  return <InvalidState />
}

function SuccessState() {
  return (
    <Section
      padding="lg"
      className="flex-1 flex flex-col items-center justify-center text-center"
      aria-labelledby="unsub-title"
    >
      <Container size="sm">
        <div className="flex flex-col items-center gap-8">
          <Wordmark size="lg" tone="gold" asLink />

          <div
            className="w-16 h-16 rounded-full bg-neutral-800/60 flex items-center justify-center"
            aria-hidden="true"
          >
            <MailX
              size={32}
              className="text-muted-foreground"
              strokeWidth={1.5}
            />
          </div>

          <div className="flex flex-col gap-3">
            <h1
              id="unsub-title"
              className="font-display font-medium text-[clamp(1.75rem,1.4rem+2vw,2.75rem)] leading-[1.1] tracking-[-0.02em] text-foreground"
            >
              You&apos;ve been unsubscribed.
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
              You won&apos;t hear from us again. We&apos;ll miss you at the Haus —
              the door is always open if you change your mind.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/" />}>
              Back to Home
            </Button>
            <Button
              size="lg"
              variant="ghost"
              nativeButton={false}
              render={<Link href="/" />}
              className="text-muted-foreground text-sm"
            >
              Changed your mind? Re-subscribe
            </Button>
          </div>

          <p className="text-xs text-muted-foreground/60 italic">
            Our Haus is Your Haus
          </p>
        </div>
      </Container>
    </Section>
  )
}

function InvalidState() {
  return (
    <Section
      padding="lg"
      className="flex-1 flex flex-col items-center justify-center text-center"
      aria-labelledby="unsub-invalid-title"
    >
      <Container size="sm">
        <div className="flex flex-col items-center gap-8">
          <Wordmark size="lg" tone="gold" asLink />

          <div
            className="w-16 h-16 rounded-full bg-neutral-800/60 flex items-center justify-center"
            aria-hidden="true"
          >
            <XCircle
              size={32}
              className="text-muted-foreground"
              strokeWidth={1.5}
            />
          </div>

          <div className="flex flex-col gap-3">
            <h1
              id="unsub-invalid-title"
              className="font-display font-medium text-[clamp(1.75rem,1.4rem+2vw,2.75rem)] leading-[1.1] tracking-[-0.02em] text-foreground"
            >
              This unsubscribe link is invalid.
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
              We couldn&apos;t find an account associated with this link. It may
              have already been used or the link may be incomplete.
            </p>
          </div>

          <Button size="lg" nativeButton={false} render={<Link href="/" />}>
            Back to Home
          </Button>
        </div>
      </Container>
    </Section>
  )
}
