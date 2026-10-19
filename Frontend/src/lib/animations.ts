import { Variants } from "framer-motion";

// Custom natural ease curve
export const easeOutCubic = [0.22, 1, 0.36, 1];
export const springSmooth = { type: "spring", stiffness: 260, damping: 20 };

// Staggered Container for sequential animations
export const staggerContainer = (staggerChildren = 0.12, delayChildren = 0): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

// Fade In Up Variant (Natural entrance from below)
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: easeOutCubic,
    },
  },
};

// Fade In Scale Variant (Pops into view)
export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 14 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: easeOutCubic,
    },
  },
};

// Slide In Left/Right
export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.55,
      ease: easeOutCubic,
    },
  },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.55,
      ease: easeOutCubic,
    },
  },
};

// SVG Draw animation for wavy underlines and hand-drawn strokes
export const svgPathDraw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.8, ease: "easeInOut", delay: 0.25 },
      opacity: { duration: 0.2, delay: 0.15 },
    },
  },
};

// Shake animation for validation & errors
export const shakeAnimation: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: {
      duration: 0.45,
      ease: easeOutCubic,
    },
  },
};
