"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/68 px-4 backdrop-blur-sm"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="glass-panel w-full max-w-md rounded-3xl p-6"
            initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-400/12 text-rose-300">
                <AlertTriangle size={20} aria-hidden="true" />
              </div>
              <div>
                <h2 id="confirm-title" className="text-lg font-semibold text-white">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="min-h-11 rounded-2xl bg-white/[0.055] px-4 text-sm font-semibold text-zinc-200 transition hover:bg-white/8 focus:outline-none focus:ring-2 focus:ring-[#bde5ad]/55"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="min-h-11 rounded-2xl bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
