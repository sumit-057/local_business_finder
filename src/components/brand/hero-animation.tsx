"use client";

import { motion } from "motion/react";

/**
 * Animated hero mark: the terrain lines draw themselves in, then a
 * pin settles and breathes. Pure vector animation via motion —
 * no external assets.
 */
export function HeroAnimation({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 64" fill="none" className={className} aria-hidden>
      {/* terrain draws in */}
      <motion.path
        d="M6 48c18-14 32-14 46-6s30 9 44-3 34-11 50 0 28 8 48-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="1 5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.6, ease: "easeOut", delay: 0.2 }}
      />
      <motion.path
        d="M20 56c16-10 30-10 44-4s26 7 40-2 30-8 44 0 24 6 36-2"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="1 6"
        strokeLinecap="round"
        opacity={0.6}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.8, ease: "easeOut", delay: 0.45 }}
      />

      {/* pin drops, then breathes forever */}
      <motion.g
        initial={{ y: -26, opacity: 0 }}
        animate={{ y: [0, 0, -3, 0], opacity: [0, 1, 1, 1] }}
        transition={{
          y: {
            delay: 1.5,
            duration: 3,
            repeat: Infinity,
            repeatDelay: 0.6,
            ease: "easeInOut",
          },
          opacity: { delay: 1.5, duration: 0.4 },
        }}
      >
        <circle cx="100" cy="22" r="12" stroke="var(--primary)" strokeWidth="2" />
        <circle cx="100" cy="22" r="4" fill="var(--mark-from)" />
      </motion.g>

      {/* sonar rings pulse out */}
      <motion.circle
        cx="100"
        cy="22"
        r="12"
        stroke="var(--primary)"
        strokeWidth="1"
        initial={{ scale: 0.6, opacity: 0.7 }}
        animate={{ scale: 2.1, opacity: 0 }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          repeatDelay: 1,
          delay: 2,
          ease: "easeOut",
        }}
        style={{ transformOrigin: "100px 22px" }}
      />
    </svg>
  );
}
