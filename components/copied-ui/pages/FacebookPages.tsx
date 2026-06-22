"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Camera, CheckCircle2, ExternalLink, PanelsTopLeft, Plug, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SkeletonChannelGrid } from "@/components/copied-ui/Skeletons";
import { TextScramble } from "@/components/copied-ui/effects/TextScramble";
import { listConnectedAccounts } from "@/lib/channels";
import { openOAuthPopup } from "@/lib/oauth-popup";
import { supabase } from "@/lib/supabase";
import type { ConnectedAccountDTO } from "@/lib/types";
import { useUiStore } from "@/lib/ui-store";
import { getPageCopy } from "@/lib/page-copy";

async function openOAuth(endpoint: string) {
  const locale = useUiStore.getState().locale;
  const t = getPageCopy(locale).pages;
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    toast.error(t.signInAgain);
    return;
  }

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  const body = await response.json().catch(() => null) as { url?: string; message?: string } | null;

  if (!response.ok || !body?.url) {
    toast.error(body?.message ?? t.authStartFailed);
    return;
  }

  const opened = openOAuthPopup(body.url, {
    name: "autopost-pages-oauth",
    expectedPaths: ["/pages", "/channels"],
    onBlocked: () => toast.error(locale === "ar" ? "المتصفح منع نافذة الربط. اسمح بالنوافذ المنبثقة وجرب تاني." : "Your browser blocked the OAuth window. Allow popups for this site and try again."),
    onClose: () => window.location.reload(),
    onComplete: (path) => window.location.assign(path),
  });

  if (opened) {
    toast.message(locale === "ar" ? "كمل الربط في النافذة الجديدة. هنحدث الصفحات بعد الرجوع." : "Finish the connection in the new window. Pages will refresh when it returns.");
  }
}

export default function FacebookPages() {
  const locale = useUiStore((state) => state.locale);
  const t = getPageCopy(locale).pages;
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<ConnectedAccountDTO[]>([]);

  const load = async () => {
    try {
      setAccounts(await listConnectedAccounts());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { queueMicrotask(() => void load()); }, []);

  const pages = useMemo(
    () => accounts.filter((account) => account.platform === "Facebook"),
    [accounts],
  );
  const linkedInstagramByPage = useMemo(() => {
    const map = new Map<string, ConnectedAccountDTO>();

    for (const account of accounts) {
      if (account.platform === "Instagram" && account.pageId) map.set(account.pageId, account);
    }

    return map;
  }, [accounts]);

  if (loading) return <SkeletonChannelGrid count={6} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <TextScramble text={t.eyebrow} className="text-[10px] text-primary font-semibold" />
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void openOAuth("/api/meta/login?platform=facebook&returnTo=/pages")} className="bg-gradient-primary text-primary-foreground shadow-glow">
            <PanelsTopLeft className="mr-1.5 h-4 w-4" /> {t.connectFacebook}
          </Button>
          <Button onClick={() => void openOAuth("/api/instagram/login?returnTo=/channels")} variant="outline" className="border-border bg-secondary/50">
            <Camera className="mr-1.5 h-4 w-4" /> {t.connectInstagram}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard label={t.connectedPages} value={pages.filter((page) => page.status === "Connected" && !page.reconnectRequired).length} />
        <SummaryCard label={t.needsReconnect} value={pages.filter((page) => page.reconnectRequired || page.status !== "Connected").length} />
        <SummaryCard label={t.linkedInstagram} value={Array.from(linkedInstagramByPage.keys()).length} />
      </div>

      {pages.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
            <PanelsTopLeft className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-display text-xl font-semibold">{t.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            {t.emptyBody}
          </p>
          <Button onClick={() => void openOAuth("/api/meta/login?platform=facebook&returnTo=/pages")} className="mt-5 bg-gradient-primary text-primary-foreground shadow-glow">
            <Plug className="mr-1.5 h-4 w-4" /> {t.connectFacebook}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page, index) => (
            <motion.div key={page.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: index * 0.03 }}>
              <PageCard page={page} linkedInstagram={page.pageId ? linkedInstagramByPage.get(page.pageId) : undefined} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}

function PageCard({ page, linkedInstagram }: { page: ConnectedAccountDTO; linkedInstagram?: ConnectedAccountDTO }) {
  const locale = useUiStore((state) => state.locale);
  const copy = getPageCopy(locale);
  const t = copy.pages;
  const common = copy.common;
  const healthy = page.status === "Connected" && !page.reconnectRequired;

  return (
    <div className="glass gradient-border rounded-2xl p-5 hover-lift">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 text-xs font-bold text-white">FB</div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base font-semibold">{page.accountName}</div>
          <div className="truncate text-xs text-muted-foreground">{page.pageId ? t.pageId(page.pageId) : t.pageIdMissing}</div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${healthy ? "border-success/20 bg-success/10 text-success" : "border-destructive/20 bg-destructive/10 text-destructive"}`}>
          {healthy ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {healthy ? t.ready : t.reconnect}
        </span>
      </div>

      <div className="mt-4 space-y-2 rounded-xl border border-border bg-secondary/30 p-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="inline-flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> {t.publishPermission}</span>
          <span className={page.publishCapable ? "text-success" : "text-warning"}>{page.publishCapable ? common.granted : t.needsReconnectValue}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="inline-flex items-center gap-2 text-muted-foreground"><Camera className="h-3.5 w-3.5" /> {t.linkedIg}</span>
          <span className={linkedInstagram ? "truncate text-success" : "text-warning"}>
            {linkedInstagram ? linkedInstagram.accountName : t.notLinked}
          </span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button onClick={() => void openOAuth("/api/meta/login?platform=facebook&returnTo=/pages")} variant="outline" size="sm" className="flex-1 border-border">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> {t.reconnectPage}
        </Button>
        <Button onClick={() => void openOAuth("/api/instagram/login?returnTo=/channels")} variant="outline" size="sm" className="border-border">
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
