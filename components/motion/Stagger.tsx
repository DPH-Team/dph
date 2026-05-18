"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ComponentPropsWithoutRef } from "react"

const EASE_OUT_WARM = [0.22, 1, 0.36, 1] as const

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
}

export const staggerChildVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: EASE_OUT_WARM,
    },
  },
}

type StaggerProps = {
  children: React.ReactNode
  className?: string
} & Omit<ComponentPropsWithoutRef<"div">, "children" | "className">

export function Stagger({ children, className, ...props }: StaggerProps) {
  const reduced = useReducedMotion()

  if (reduced) {
    return <>{children}</>
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10%" }}
      className={className}
      {...(props as ComponentPropsWithoutRef<typeof motion.div>)}
    >
      {children}
    </motion.div>
  )
}

type StaggerItemProps = {
  children: React.ReactNode
  className?: string
} & Omit<ComponentPropsWithoutRef<"div">, "children" | "className">

export function StaggerItem({ children, className, ...props }: StaggerItemProps) {
  const reduced = useReducedMotion()

  if (reduced) {
    return <>{children}</>
  }

  return (
    <motion.div
      variants={staggerChildVariants}
      className={className}
      {...(props as ComponentPropsWithoutRef<typeof motion.div>)}
    >
      {children}
    </motion.div>
  )
}
