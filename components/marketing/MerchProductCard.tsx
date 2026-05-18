import Image from "next/image"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MerchProduct } from "@/lib/fixtures/types"

export type MerchProductCardProps = {
  product: MerchProduct
  className?: string
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function MerchProductCard({ product, className }: MerchProductCardProps) {
  return (
    <article className={cn("group flex flex-col rounded-xl bg-card border border-border overflow-hidden", className)}>
      <a
        href={product.printifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-label={`${product.title} — opens in new tab`}
      >
        <div className="aspect-square bg-neutral-900 relative overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </a>

      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm text-foreground leading-tight">
            {product.title}
          </h3>
          <span className="tabular-nums text-sm font-medium text-primary shrink-0">
            {formatPrice(product.priceCents)}
          </span>
        </div>

        <a
          href={product.printifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors w-fit"
        >
          View product
          <ExternalLink size={11} aria-hidden="true" />
        </a>
      </div>
    </article>
  )
}
