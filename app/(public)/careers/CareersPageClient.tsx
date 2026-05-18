"use client"

import { useRef } from "react"
import { PositionCard } from "@/components/marketing/PositionCard"
import { CareersForm } from "@/components/marketing/forms/CareersForm"
import type { Posting } from "@/lib/fixtures/types"

export type CareersPageClientProps = {
  positions: Posting[]
}

export function CareersPageClient({ positions }: CareersPageClientProps) {
  const formRef = useRef<HTMLDivElement>(null)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleApply = (positionId: string) => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {positions.map((posting) => (
          <PositionCard key={posting.id} posting={posting} onApply={handleApply} />
        ))}
      </div>

      <div ref={formRef} className="scroll-mt-28">
        <CareersForm positions={positions} />
      </div>
    </>
  )
}
