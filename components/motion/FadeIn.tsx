"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ComponentPropsWithoutRef } from "react"

const EASE_OUT_WARM = [0.22, 1, 0.36, 1] as const

type FadeInProps = {
  children: React.ReactNode
  className?: string
  delay?: number
} & Omit<ComponentPropsWithoutRef<"div">, "children" | "className">

export function FadeIn({ children, className, delay = 0, ...props }: FadeInProps) {
  const reduced = useReducedMotion()

  if (reduced) {
    return <>{children}</>
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.28,
        ease: EASE_OUT_WARM,
        delay,
      }}
      className={className}
      {...(props as ComponentPropsWithoutRef<typeof motion.div>)}
    >
      {children}
    </motion.div>
  )
}
