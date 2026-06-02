import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Word { text: string; className?: string }

export function Typewriter({ words, className }: { words: Word[]; className?: string }) {
  return (
    <div className={cn("inline-flex flex-wrap items-center gap-x-2", className)}>
      <motion.div initial="hidden" animate="visible" className="inline-flex flex-wrap gap-x-2">
        {words.map((word, index) => (
          <div key={`${word.text}-${index}`} className="inline-block">
            {word.text.split("").map((character, characterIndex) => (
              <motion.span key={`${character}-${characterIndex}`} variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} transition={{ delay: index * 0.18 + characterIndex * 0.04, duration: 0.18 }} className={cn("inline-block", word.className)}>
                {character}
              </motion.span>
            ))}
          </div>
        ))}
      </motion.div>
      <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.9, repeat: Infinity }} className="inline-block h-[1em] w-[3px] translate-y-[2px] rounded-sm bg-primary" />
    </div>
  );
}

export function TypewriterCycle({ phrases, className, interval = 2600 }: { phrases: string[]; className?: string; interval?: number }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const current = phrases[index % phrases.length];
    const timeout = window.setTimeout(() => {
      if (!deleting && text.length < current.length) setText(current.slice(0, text.length + 1));
      else if (!deleting) setDeleting(true);
      else if (text.length > 0) setText(current.slice(0, text.length - 1));
      else { setDeleting(false); setIndex((value) => value + 1); }
    }, !deleting && text.length === current.length ? interval : deleting ? 28 : 55);
    return () => window.clearTimeout(timeout);
  }, [deleting, index, interval, phrases, text]);
  return <span className={cn("inline-flex items-center", className)}><span>{text}</span><motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="ml-1 inline-block h-[0.9em] w-[2px] bg-primary" /></span>;
}
