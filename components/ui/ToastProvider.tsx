"use client";

import { Toaster } from "sonner";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      closeButton
      theme="dark"
      toastOptions={{
        classNames: {
          toast:
            "border border-white/10 bg-[#0d0d0e] text-white shadow-[0_14px_36px_rgb(0_0_0_/_0.28)]",
          title: "font-black text-white",
          description: "text-zinc-400",
          actionButton: "silent-button rounded-md px-3 text-xs font-black",
          cancelButton: "rounded-md bg-white/8 px-3 text-xs font-black text-white",
          closeButton: "border-white/10 bg-white/8 text-white",
        },
      }}
    />
  );
}
