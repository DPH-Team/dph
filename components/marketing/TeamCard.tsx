import Image from "next/image"
import { User } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TeamMember } from "@/lib/fixtures/types"

export type TeamCardProps = {
  member: TeamMember
  className?: string
}

export function TeamCard({ member, className }: TeamCardProps) {
  return (
    <article className={cn("flex flex-col gap-4", className)}>
      <div className="relative aspect-square rounded-xl overflow-hidden bg-card border border-border">
        {member.imageUrl ? (
          <Image
            src={member.imageUrl}
            alt={`${member.name}, ${member.role}`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
            <User
              size={48}
              className="text-muted-foreground/40"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="font-display font-medium text-lg text-foreground">
          {member.name}
        </h3>
        <p className="text-sm font-medium text-primary">{member.role}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{member.bio}</p>
      </div>
    </article>
  )
}
