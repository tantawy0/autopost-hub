import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function HandWritingText({ text, className }: { text: string; className?: string }) {
  return (
    <motion.svg viewBox="0 0 600 80" className={cn("w-full h-auto", className)} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}>
      <motion.text
        x="10" y="55" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="currentColor"
        style={{ fontFamily: '"Caveat", "Dancing Script", cursive', fontSize: 52 }}
        variants={{ hidden: { pathLength: 0, fillOpacity: 0 }, visible: { pathLength: 1, fillOpacity: 1, transition: { pathLength: { duration: 2.2, ease: "easeInOut" }, fillOpacity: { delay: 1.8, duration: 0.8 } } } }}
      >
        {text}
      </motion.text>
    </motion.svg>
  );
}
