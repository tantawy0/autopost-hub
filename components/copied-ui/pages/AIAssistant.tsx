"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ShiningText } from "@/components/copied-ui/effects/ShiningText";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { getPageCopy } from "@/lib/page-copy";
import { useUiStore } from "@/lib/ui-store";

interface Msg {
  role: "user" | "ai";
  text: string;
}

export default function AIAssistant() {
  const locale = useUiStore((state) => state.locale);
  const t = getPageCopy(locale).ai;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([{ role: "ai", text: t.welcome }]);
  const [busy, setBusy] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;

    setMessages((current) => [...current, { role: "user", text }]);
    setInput("");
    setBusy(true);

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: await getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ prompt: text }),
      });
      const body = await response.json().catch(() => null) as { suggestions?: string[]; message?: string } | null;

      if (!response.ok) throw new Error(body?.message ?? t.failed);

      setMessages((current) => [...current, { role: "ai", text: body?.suggestions?.join("\n\n") ?? t.empty }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="font-display flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Sparkles className="h-6 w-6 text-accent" />
          <ShiningText>{t.title}</ShiningText>
        </h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {t.starters.map((prompt) => (
          <button
            key={prompt}
            onClick={() => void send(prompt)}
            className="rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs transition hover:border-primary/30 hover:bg-secondary"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="glass min-h-[400px] space-y-5 rounded-2xl p-5">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <motion.div
              key={`${message.role}-${index}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role === "ai" ? (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </div>
              ) : null}
              <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl p-3.5 text-sm ${message.role === "user" ? "bg-gradient-primary text-primary-foreground" : "bg-secondary/60"}`}>
                {message.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {busy ? <div className="text-xs text-muted-foreground">{t.thinking}</div> : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="glass flex items-center gap-2 rounded-2xl p-2"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t.placeholder}
          className="flex-1 bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:outline-none"
        />
        <Button type="submit" disabled={busy} className="bg-gradient-primary text-primary-foreground" aria-label={t.send}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
