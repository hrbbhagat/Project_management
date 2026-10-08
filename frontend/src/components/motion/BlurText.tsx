// Adapted from DavidHDev/react-bits, TextAnimations/BlurText (MIT).
// https://github.com/DavidHDev/react-bits
import { motion, useReducedMotion } from "motion/react";

export function BlurText({ text, className = "" }: { text: string; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          aria-hidden="true"
          className="inline-block"
          initial={false}
          animate={reduced ? {} : { filter: ["blur(8px)", "blur(0px)"], opacity: [0, 1], y: [12, 0] }}
          transition={{ duration: 0.65, delay: index * 0.075, ease: "easeOut" }}
        >
          {word}{index < text.split(" ").length - 1 ? "\u00a0" : ""}
        </motion.span>
      ))}
    </span>
  );
}