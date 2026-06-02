import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/ui-store";

export function AnimatedThemeToggler({ className }: { className?: string }) {
  const theme = useUiStore((state) => state.theme);
  const toggle = useUiStore((state) => state.toggleTheme);
  const setTheme = useUiStore((state) => state.setTheme);
  useEffect(() => {
    const saved = window.localStorage.getItem("autopost:theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, [setTheme]);
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("autopost:theme", theme);
  }, [theme]);
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={cn(
        "relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-border bg-secondary/60 hover:bg-secondary transition",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: -16, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 16, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="absolute"
        >
          {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
