"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Activity, AlertTriangle, Camera, CheckCircle2, ChevronRight, Clock, ExternalLink, PanelsTopLeft, Plug, RotateCw, Settings as SettingsIcon, Shield, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/copied-ui/PlatformBadge";
import { SkeletonChannelGrid } from "@/components/copied-ui/Skeletons";
import { TextScramble } from "@/components/copied-ui/effects/TextScramble";
import { disconnectConnectedAccount, listConnectedAccounts } from "@/lib/channels";
import { openOAuthPopup } from "@/lib/oauth-popup";
import { supabase } from "@/lib/supabase";
import { toUiChannel, type UiChannel, type UiPlatform } from "@/lib/ui-repo-adapters";
import { useUiStore } from "@/lib/ui-store";
import { getPageCopy, getPermissionLabel, getPlatformName } from "@/lib/page-copy";

type FilterKey = "all" | "connected" | "needs-action" | "reauth" | "disconnected";
const statusMap: Record<UiChannel["status"], { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  healthy: { label: "Connected", cls: "text-success bg-success/10 border-success/20", Icon: CheckCircle2 },
  warning: { label: "Needs action", cls: "text-warning bg-warning/10 border-warning/20", Icon: AlertTriangle },
  error: { label: "Re-auth required", cls: "text-destructive bg-destructive/10 border-destructive/20", Icon: XCircle },
  disconnected: { label: "Disconnected", cls: "text-muted-foreground bg-secondary border-border", Icon: Plug },
};
const filterMatches: Record<FilterKey, UiChannel["status"][]> = { all: ["healthy","warning","error","disconnected"], connected: ["healthy"], "needs-action": ["warning"], reauth: ["error"], disconnected: ["disconnected"] };
const platforms: UiPlatform[] = ["instagram","facebook","linkedin","tiktok"];

function channelErrorMessage(code: string, locale = useUiStore.getState().locale) {
  const t = getPageCopy(locale).channels;
  return t.errorMessages[code as keyof typeof t.errorMessages] ?? t.unknownError(code);
}

export default function Channels() {
  const locale = useUiStore((state) => state.locale);
  const copy = getPageCopy(locale);
  const t = copy.channels;
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [channels, setChannels] = useState<UiChannel[]>([]);
  const [connecting, setConnecting] = useState<UiPlatform | null>(null);
  const load = async () => {
    try {
      const connected = (await listConnectedAccounts()).map(toUiChannel);
      const connectedPlatforms = new Set(connected.map((account) => account.platform));
      const missing = platforms
        .filter((platform) => !connectedPlatforms.has(platform))
        .map((platform) => ({
          id: `disconnected-${platform}`,
          platform,
          handle: "Not connected",
          status: "disconnected" as const,
          followers: 0,
          lastSync: "-",
          tokenHealth: 0,
          permissions: [],
        }));
      setChannels([...connected, ...missing]);
    } catch (error) { toast.error(error instanceof Error ? error.message : t.loadError); }
    finally { setLoading(false); }
  };
  useEffect(() => { queueMicrotask(() => void load()); }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const connected = params.get("connected");
    if (error) toast.error(channelErrorMessage(error, locale));
    if (connected) toast.success(t.connectedToast(connected));
    if (!error && !connected) return;
    window.history.replaceState(null, "", "/channels");
  }, []);
  const connect = async (platform: UiPlatform) => {
    if (platform === "tiktok") { toast.message(t.tiktokSoon); return; }
    setConnecting(platform);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error(t.signInAgain); return; }
      const endpoint =
        platform === "linkedin"
          ? "/api/linkedin/login?returnTo=/channels"
          : platform === "instagram"
            ? "/api/instagram/login?returnTo=/channels"
            : `/api/meta/login?platform=${platform}&returnTo=/channels`;
      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const body = await response.json().catch(() => null) as { url?: string; message?: string } | null;
      if (!response.ok || !body?.url) { toast.error(body?.message ?? t.authStartFailed); return; }
      const opened = openOAuthPopup(body.url, {
        name: `autopost-${platform}-oauth`,
        onBlocked: () => toast.error(locale === "ar" ? "المتصفح منع نافذة الربط. اسمح بالنوافذ المنبثقة وجرب تاني." : "Your browser blocked the OAuth window. Allow popups for this site and try again."),
        onClose: () => void load(),
        onComplete: (path) => window.location.assign(path),
      });
      if (opened) {
        toast.message(locale === "ar" ? "كمل الربط في النافذة الجديدة. هنحدث القنوات بعد الرجوع." : "Finish the connection in the new window. Channels will refresh when it returns.");
      }
    } finally {
      setConnecting(null);
    }
  };
  const disconnect = async (channel: UiChannel) => {
    if (!channel.source) return;
    if (!window.confirm(t.disconnectConfirm(channel.handle))) return;
    try { await disconnectConnectedAccount(channel.source.id); toast.success(t.disconnectedToast); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : t.disconnectFailed); }
  };
  const counts = useMemo(() => ({ connected: channels.filter(c => c.status === "healthy").length, "needs-action": channels.filter(c => c.status === "warning").length, reauth: channels.filter(c => c.status === "error").length, disconnected: channels.filter(c => c.status === "disconnected").length }), [channels]);
  const list = channels.filter(c => filterMatches[filter].includes(c.status));

  return <div className="space-y-6">
    <div className="flex items-end justify-between flex-wrap gap-3">
      <div>
        <TextScramble text={t.eyebrow} className="text-[10px] text-primary font-semibold" />
        <h1 className="font-display text-3xl font-bold tracking-tight mt-2">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void connect("instagram")} className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Camera className="mr-1.5 h-4 w-4" /> {t.connectInstagram}
        </Button>
        <Button onClick={() => void connect("facebook")} variant="outline" className="border-border bg-secondary/50">
          <PanelsTopLeft className="mr-1.5 h-4 w-4" /> {t.connectFacebook}
        </Button>
        <Button asChild variant="outline" className="border-border bg-secondary/50">
          <Link href="/pages"><ExternalLink className="mr-1.5 h-4 w-4" /> {t.pages}</Link>
        </Button>
      </div>
    </div>
    <MetaFlowNotice />
    <FacebookPagesSnapshot channels={channels} />
    <div className="flex flex-wrap gap-2"><FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={t.filterAll} badge={channels.length} /><FilterChip active={filter === "connected"} onClick={() => setFilter("connected")} label={t.filterConnected} badge={counts.connected} tone="success" /><FilterChip active={filter === "needs-action"} onClick={() => setFilter("needs-action")} label={t.filterNeedsAction} badge={counts["needs-action"]} tone="warning" /><FilterChip active={filter === "reauth"} onClick={() => setFilter("reauth")} label={t.filterReauth} badge={counts.reauth} tone="destructive" /><FilterChip active={filter === "disconnected"} onClick={() => setFilter("disconnected")} label={t.filterDisconnected} badge={counts.disconnected} /></div>
    {loading ? <SkeletonChannelGrid count={4} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map((channel, index) => <motion.div key={channel.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.25,delay:index*0.03}}><ChannelCard channel={channel} connect={connect} disconnect={disconnect} connecting={connecting === channel.platform} locale={locale} /></motion.div>)}</div>}
  </div>;
}

function MetaFlowNotice() {
  const locale = useUiStore((state) => state.locale);
  const t = getPageCopy(locale).channels;
  return (
    <div className="glass rounded-2xl p-4 text-sm text-muted-foreground">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 font-semibold text-foreground">
          <Camera className="h-4 w-4 text-primary" /> {t.instagramNoticeTitle}
        </span>
        <span className="hidden h-1 w-1 rounded-full bg-border md:inline-block" />
        <span>{t.instagramNoticeBody}</span>
      </div>
    </div>
  );
}

function FacebookPagesSnapshot({ channels }: { channels: UiChannel[] }) {
  const locale = useUiStore((state) => state.locale);
  const t = getPageCopy(locale).channels;
  const pages = channels.filter((channel) => channel.platform === "facebook" && channel.status !== "disconnected");
  const instagramByPage = new Map(
    channels
      .filter((channel) => channel.platform === "instagram" && channel.source?.pageId)
      .map((channel) => [channel.source?.pageId, channel]),
  );

  if (pages.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{t.pagesSnapshotTitle}</div>
          <p className="text-xs text-muted-foreground">{t.pagesSnapshotBody}</p>
        </div>
        <Button asChild variant="outline" size="sm" className="border-border">
          <Link href="/pages">{t.openPages}</Link>
        </Button>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {pages.slice(0, 4).map((page) => {
          const linkedInstagram = instagramByPage.get(page.source?.pageId);
          return (
            <div key={page.id} className="rounded-xl border border-border bg-secondary/30 p-3">
              <div className="truncate text-sm font-semibold">{page.handle}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {linkedInstagram ? t.linkedIg(linkedInstagram.handle) : t.noLinkedIg}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChannelCard({ channel: c, connect, disconnect, connecting, locale }: { channel: UiChannel; connect: (platform: UiPlatform) => Promise<void>; disconnect: (channel: UiChannel) => Promise<void>; connecting: boolean; locale: "en" | "ar" }) {
  const copy = getPageCopy(locale);
  const t = copy.channels;
  const common = copy.common;
  const liveLabel = locale === "ar" ? "مباشر" : "Live";
  const meta = statusMap[c.status]; const Icon = meta.Icon; const disconnected = c.status === "disconnected";
  const statusLabel = c.status === "healthy" ? t.statusConnected : c.status === "warning" ? t.statusWarning : c.status === "error" ? t.statusError : t.statusDisconnected;
  return <div className="glass gradient-border rounded-2xl p-5 hover-lift"><div className="flex items-start gap-3"><PlatformBadge platform={c.platform} size="md" /><div className="flex-1 min-w-0"><div className="font-display text-base font-semibold truncate">{getPlatformName(c.platform, locale)}</div><div className="text-xs text-muted-foreground truncate">{disconnected ? common.notConnected : c.handle}</div></div><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.cls}`}><Icon className="h-3 w-3" /> {statusLabel}</span></div>
    {!disconnected ? <><div className="mt-4 grid grid-cols-3 gap-2 text-center"><Mini icon={Activity} label={t.followers} value={common.synced} /><Mini icon={Clock} label={t.lastSync} value={c.lastSync === "Live" ? liveLabel : c.lastSync} /><Mini icon={Shield} label={t.token} value={`${c.tokenHealth}%`} /></div><div className="mt-3"><div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground"><span>{t.tokenHealth}</span><span className={c.tokenHealth < 50 ? "text-warning" : "text-success"}>{c.tokenHealth}%</span></div><div className="mt-1 h-1.5 w-full rounded-full bg-secondary"><div className={`h-full rounded-full ${c.tokenHealth < 50 ? "bg-warning" : "bg-gradient-primary"}`} style={{width:`${c.tokenHealth}%`}} /></div></div><div className="mt-3 space-y-1.5">{c.permissions.map(permission => <div key={permission.name} className="flex items-center justify-between text-[11px]"><span className="text-muted-foreground">{getPermissionLabel(permission.name, locale)}</span><span className={`inline-flex items-center gap-1 ${permission.granted ? "text-success" : "text-warning"}`}>{permission.granted ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}{permission.granted ? common.granted : common.missing}</span></div>)}</div></> : null}
    <div className="mt-4 flex gap-2">{c.status === "healthy" ? <><Button onClick={() => void disconnect(c)} variant="outline" size="sm" className="flex-1 border-border"><SettingsIcon className="mr-1.5 h-3.5 w-3.5" /> {common.disconnect}</Button><Button disabled={connecting} onClick={() => void connect(c.platform)} variant="outline" size="sm" className="border-border"><RotateCw className="h-3.5 w-3.5" /></Button></> : <Button disabled={connecting} onClick={() => void connect(c.platform)} size="sm" className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow"><Plug className="mr-1.5 h-3.5 w-3.5" /> {connecting ? common.opening : disconnected ? common.connect : common.reconnect}<ChevronRight className="ml-auto h-3.5 w-3.5" /></Button>}</div>
  </div>;
}
function Mini({ icon: Icon, label, value }: { icon: ComponentType<{className?: string}>; label: string; value: string }) { return <div className="rounded-lg bg-secondary/40 px-2 py-1.5"><div className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1"><Icon className="h-3 w-3" />{label}</div><div className="mt-0.5 text-xs font-semibold truncate">{value}</div></div>; }
function FilterChip({ active, onClick, label, badge, tone }: { active:boolean; onClick:()=>void; label:string; badge:number; tone?:"success"|"warning"|"destructive" }) { const toneCls=tone==="success"?"bg-success/20 text-success":tone==="warning"?"bg-warning/20 text-warning":tone==="destructive"?"bg-destructive/20 text-destructive":"bg-secondary text-muted-foreground"; return <button onClick={onClick} className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${active?"border-primary/40 bg-primary/10 text-foreground":"border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>{label}<span className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${active?"bg-primary/20 text-primary":toneCls}`}>{badge}</span></button>; }
