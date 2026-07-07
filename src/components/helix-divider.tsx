"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * The site's one signature visual element — an abstracted double helix,
 * directly derived from the DNA strand in the NIMASREPUB logo. Used
 * sparingly (once, prominently) rather than repeated as decoration.
 */
export function HelixDivider({ className = "" }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  const strandA =
    "M0,20 C50,6 100,6 150,20 C200,34 250,34 300,20 C350,6 400,6 450,20 " +
    "C500,34 550,34 600,20 C650,6 700,6 750,20 C800,34 850,34 900,20 " +
    "C950,6 1000,6 1050,20 C1100,34 1150,34 1200,20";

  const strandB =
    "M0,20 C50,34 100,34 150,20 C200,6 250,6 300,20 C350,34 400,34 450,20 " +
    "C500,6 550,6 600,20 C650,34 700,34 750,20 C800,6 850,6 900,20 " +
    "C950,34 1000,34 1050,20 C1100,6 1150,6 1200,20";

  const rungs = [75, 225, 375, 525, 675, 825, 975, 1125];

  return (
    <div className={`w-full ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
        className="h-8 w-full"
      >
        {rungs.map((x) => (
          <line
            key={x}
            x1={x}
            y1={11}
            x2={x}
            y2={29}
            stroke="var(--border)"
            strokeWidth={1.5}
          />
        ))}
        <motion.path
          d={strandB}
          fill="none"
          stroke="var(--brand-blue)"
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={reduceMotion ? undefined : { pathLength: 0 }}
          whileInView={reduceMotion ? undefined : { pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        />
        <motion.path
          d={strandA}
          fill="none"
          stroke="var(--brand-green)"
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={reduceMotion ? undefined : { pathLength: 0 }}
          whileInView={reduceMotion ? undefined : { pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: "easeInOut", delay: 0.15 }}
        />
      </svg>
    </div>
  );
}
