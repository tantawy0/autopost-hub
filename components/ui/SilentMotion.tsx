"use client";

import {
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export const silentSpring = {
  type: "spring" as const,
  stiffness: 270,
  damping: 31,
  mass: 0.82,
};

export const softSpring = {
  type: "spring" as const,
  stiffness: 190,
  damping: 24,
  mass: 0.9,
};

export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export function SilentMotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={silentSpring}>
      {children}
    </MotionConfig>
  );
}

export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : pageTransition.initial}
      animate={pageTransition.animate}
      exit={pageTransition.exit}
      transition={reduceMotion ? { duration: 0 } : softSpring}
    >
      {children}
    </motion.div>
  );
}

export function StaggerReveal({
  children,
  className,
  delay = 0.045,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : "hidden"}
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: reduceMotion ? 0 : delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduceMotion ? {} : { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 },
      }}
      transition={reduceMotion ? { duration: 0 } : softSpring}
    >
      {children}
    </motion.div>
  );
}

export function ViewportReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 16, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.18 }}
      transition={reduceMotion ? { duration: 0 } : { ...softSpring, delay }}
    >
      {children}
    </motion.div>
  );
}

type MagneticButtonProps = HTMLMotionProps<"button">;

export function MagneticButton({
  children,
  className,
  onMouseMove,
  onMouseLeave,
  style,
  ...props
}: MagneticButtonProps) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 210, damping: 20, mass: 0.35 });
  const springY = useSpring(y, { stiffness: 210, damping: 20, mass: 0.35 });

  return (
    <motion.button
      {...props}
      className={className}
      style={{ ...style, x: springX, y: springY }}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      onMouseMove={(event) => {
        if (!reduceMotion) {
          const rect = event.currentTarget.getBoundingClientRect();
          x.set((event.clientX - rect.left - rect.width / 2) * 0.08);
          y.set((event.clientY - rect.top - rect.height / 2) * 0.12);
        }
        onMouseMove?.(event);
      }}
      onMouseLeave={(event) => {
        x.set(0);
        y.set(0);
        onMouseLeave?.(event);
      }}
    >
      {children}
    </motion.button>
  );
}

export function AnimatedNumber({
  value,
  className,
  suffix = "",
}: {
  value: number;
  className?: string;
  suffix?: string;
}) {
  const reduceMotion = useReducedMotion();
  const valueRef = useRef(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (reduceMotion) {
      valueRef.current = value;
      return;
    }

    const controls = animate(valueRef.current, value, {
      duration: 0.36,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        valueRef.current = latest;
        setDisplay(Math.round(latest));
      },
    });

    return () => controls.stop();
  }, [reduceMotion, value]);

  return (
    <span className={className}>
      {(reduceMotion ? value : display).toLocaleString()}
      {suffix}
    </span>
  );
}
