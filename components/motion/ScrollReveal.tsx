"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ComponentPropsWithoutRef } from "react"

const EASE_OUT_WARM = [0.22, 1, 0.36, 1] as const

type ScrollRevealProps = {
  children: React.ReactNode
  className?: string
  once?: boolean
  delay?: number
} & Omit<ComponentPropsWithoutRef<"div">, "children" | "className">

export function ScrollReveal({
  children,
  className,
  once = true,
  delay = 0,
  ...props
}: ScrollRevealProps) {
  const reduced = useReducedMotion()

  if (reduced) {
    return <>{children}</>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-12%" }}
      transition={{
        duration: 0.52,
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
