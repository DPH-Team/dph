import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle, XCircle } from "lucide-react"

import { confirmSubscriber } from "@/lib/db/queries/subscribers"
import { audit } from "@/lib/audit"
import { Wordmark } from "@/components/marketing/Wordmark"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Confirm Your Subscription | District Pour Haus",
  robots: { index: false, follow: false },
}

export default async function NewsletterConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { token } = await searchParams
  const tokenValue = Array.isArray(token) ? token[0] : token

  if (!tokenValue || tokenValue.trim() === "") {
    return <InvalidState />
  }

  let res: Awaited<ReturnType<typeof confirmSubscriber>>
  try {
    res = await confirmSubscriber(tokenValue)
  } catch {
    return <InvalidState />
  }

  if (res.status === "confirmed") {
    void audit(
      "subscriber.confirm",
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
      aria-labelledby="confirm-title"
    >
      <Container size="sm">
        <div className="flex flex-col items-center gap-8">
          <Wordmark size="lg" asLink />

          <div
            className="w-16 h-16 rounded-full bg-copper/15 flex items-center justify-center"
            aria-hidden="true"
          >
            <CheckCircle
              size={32}
              className="text-copper"
              strokeWidth={1.5}
            />
          </div>

          <div className="flex flex-col gap-3">
            <h1
              id="confirm-title"
              className="font-display font-medium text-[clamp(1.75rem,1.4rem+2vw,2.75rem)] leading-[1.1] tracking-[-0.02em] text-foreground"
            >
              You&apos;re in. Welcome to the Haus.
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
              You&apos;ll hear from us when new taps hit the wall, events are
              coming up, and whenever something worth sharing is on at District
              Pour Haus. We keep it to the good stuff.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/" />}>
              Back to Home
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/taps" />}
            >
              See What&apos;s on Tap
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
      aria-labelledby="confirm-invalid-title"
    >
      <Container size="sm">
        <div className="flex flex-col items-center gap-8">
          <Wordmark size="lg" asLink />

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
              id="confirm-invalid-title"
              className="font-display font-medium text-[clamp(1.75rem,1.4rem+2vw,2.75rem)] leading-[1.1] tracking-[-0.02em] text-foreground"
            >
              This link isn&apos;t valid
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
              This confirmation link is invalid or has already been used. If you
              meant to subscribe, head back to the homepage and sign up again.
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
