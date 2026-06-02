"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Activity, AlertTriangle, CheckCircle2, ChevronRight, Clock, Plug, RotateCw, Settings as SettingsIcon, Shield, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/copied-ui/PlatformBadge";
import { SkeletonChannelGrid } from "@/components/copied-ui/Skeletons";
import { TextScramble } from "@/components/copied-ui/effects/TextScramble";
import { disconnectConnectedAccount, listConnectedAccounts } from "@/lib/channels";
import { supabase } from "@/lib/supabase";
import { toUiChannel, type UiChannel, type UiPlatform, uiPlatformMeta as platformMeta } from "@/lib/ui-repo-adapters";

type FilterKey = "all" | "connected" | "needs-action" | "reauth" | "disconnected";
const statusMap: Record<UiChannel["status"], { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  healthy: { label: "Connected", cls: "text-success bg-success/10 border-success/20", Icon: CheckCircle2 },
  warning: { label: "Needs action", cls: "text-warning bg-warning/10 border-warning/20", Icon: AlertTriangle },
  error: { label: "Re-auth required", cls: "text-destructive bg-destructive/10 border-destructive/20", Icon: XCircle },
  disconnected: { label: "Disconnected", cls: "text-muted-foreground bg-secondary border-border", Icon: Plug },
};
const filterMatches: Record<FilterKey, UiChannel["status"][]> = { all: ["healthy","warning","error","disconnected"], connected: ["healthy"], "needs-action": ["warning"], reauth: ["error"], disconnected: ["disconnected"] };
const platforms: UiPlatform[] = ["instagram","facebook","linkedin","tiktok"];

export default function Channels() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [channels, setChannels] = useState<UiChannel[]>([]);
  const load = async () => {
    try {
      const connected = (await listConnectedAccounts()).map(toUiChannel);
      setChannels(platforms.map((platform) => connected.find((account) => account.platform === platform) ?? { id: `disconnected-${platform}`, platform, handle: "Not connected", status: "disconnected", followers: 0, lastSync: "-", tokenHealth: 0, permissions: [] }));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load channels"); }
    finally { setLoading(false); }
  };
  useEffect(() => { queueMicrotask(() => void load()); }, []);
  const connect = async (platform: UiPlatform) => {
    if (platform === "tiktok") { toast.message("TikTok connection is coming soon"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { toast.error("Sign in again before connecting a channel"); return; }
    const endpoint = platform === "linkedin" ? "/api/linkedin/login?returnTo=/channels" : `/api/meta/login?platform=${platform}&returnTo=/channels`;
    const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${session.access_token}` } });
    const body = await response.json().catch(() => null) as { url?: string; message?: string } | null;
    if (!response.ok || !body?.url) { toast.error(body?.message ?? "Unable to start authorization"); return; }
    window.location.assign(body.url);
  };
  const disconnect = async (channel: UiChannel) => {
    if (!channel.source) return;
    try { await disconnectConnectedAccount(channel.source.id); toast.success("Channel disconnected"); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to disconnect channel"); }
  };
  const counts = useMemo(() => ({ connected: channels.filter(c => c.status === "healthy").length, "needs-action": channels.filter(c => c.status === "warning").length, reauth: channels.filter(c => c.status === "error").length, disconnected: channels.filter(c => c.status === "disconnected").length }), [channels]);
  const list = channels.filter(c => filterMatches[filter].includes(c.status));

  return <div className="space-y-6">
    <div className="flex items-end justify-between flex-wrap gap-3"><div><TextScramble text="INTEGRATIONS HUB" className="text-[10px] text-primary font-semibold" /><h1 className="font-display text-3xl font-bold tracking-tight mt-2">Channels</h1><p className="text-sm text-muted-foreground">Manage every connected account, token, and permission in one place.</p></div><Button onClick={() => void connect("instagram")} className="bg-gradient-primary text-primary-foreground shadow-glow"><Plug className="mr-1.5 h-4 w-4" /> Connect channel</Button></div>
    <div className="flex flex-wrap gap-2"><FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" badge={channels.length} /><FilterChip active={filter === "connected"} onClick={() => setFilter("connected")} label="Connected" badge={counts.connected} tone="success" /><FilterChip active={filter === "needs-action"} onClick={() => setFilter("needs-action")} label="Needs action" badge={counts["needs-action"]} tone="warning" /><FilterChip active={filter === "reauth"} onClick={() => setFilter("reauth")} label="Re-auth" badge={counts.reauth} tone="destructive" /><FilterChip active={filter === "disconnected"} onClick={() => setFilter("disconnected")} label="Disconnected" badge={counts.disconnected} /></div>
    {loading ? <SkeletonChannelGrid count={4} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map((channel, index) => <motion.div key={channel.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.25,delay:index*0.03}}><ChannelCard channel={channel} connect={connect} disconnect={disconnect} /></motion.div>)}</div>}
  </div>;
}

function ChannelCard({ channel: c, connect, disconnect }: { channel: UiChannel; connect: (platform: UiPlatform) => Promise<void>; disconnect: (channel: UiChannel) => Promise<void> }) {
  const meta = statusMap[c.status]; const Icon = meta.Icon; const disconnected = c.status === "disconnected";
  return <div className="glass gradient-border rounded-2xl p-5 hover-lift"><div className="flex items-start gap-3"><PlatformBadge platform={c.platform} size="md" /><div className="flex-1 min-w-0"><div className="font-display text-base font-semibold truncate">{platformMeta[c.platform].name}</div><div className="text-xs text-muted-foreground truncate">{disconnected ? "Not connected" : c.handle}</div></div><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.cls}`}><Icon className="h-3 w-3" /> {meta.label}</span></div>
    {!disconnected ? <><div className="mt-4 grid grid-cols-3 gap-2 text-center"><Mini icon={Activity} label="Followers" value="Synced" /><Mini icon={Clock} label="Last sync" value={c.lastSync} /><Mini icon={Shield} label="Token" value={`${c.tokenHealth}%`} /></div><div className="mt-3"><div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground"><span>Token health</span><span className={c.tokenHealth < 50 ? "text-warning" : "text-success"}>{c.tokenHealth}%</span></div><div className="mt-1 h-1.5 w-full rounded-full bg-secondary"><div className={`h-full rounded-full ${c.tokenHealth < 50 ? "bg-warning" : "bg-gradient-primary"}`} style={{width:`${c.tokenHealth}%`}} /></div></div><div className="mt-3 space-y-1.5">{c.permissions.map(permission => <div key={permission.name} className="flex items-center justify-between text-[11px]"><span className="text-muted-foreground">{permission.name}</span><span className={`inline-flex items-center gap-1 ${permission.granted ? "text-success" : "text-warning"}`}>{permission.granted ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}{permission.granted ? "Granted" : "Missing"}</span></div>)}</div></> : null}
    <div className="mt-4 flex gap-2">{c.status === "healthy" ? <><Button onClick={() => void disconnect(c)} variant="outline" size="sm" className="flex-1 border-border"><SettingsIcon className="mr-1.5 h-3.5 w-3.5" /> Disconnect</Button><Button onClick={() => void connect(c.platform)} variant="outline" size="sm" className="border-border"><RotateCw className="h-3.5 w-3.5" /></Button></> : <Button onClick={() => void connect(c.platform)} size="sm" className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow"><Plug className="mr-1.5 h-3.5 w-3.5" /> {disconnected ? "Connect" : "Reconnect"}<ChevronRight className="ml-auto h-3.5 w-3.5" /></Button>}</div>
  </div>;
}
function Mini({ icon: Icon, label, value }: { icon: ComponentType<{className?: string}>; label: string; value: string }) { return <div className="rounded-lg bg-secondary/40 px-2 py-1.5"><div className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1"><Icon className="h-3 w-3" />{label}</div><div className="mt-0.5 text-xs font-semibold truncate">{value}</div></div>; }
function FilterChip({ active, onClick, label, badge, tone }: { active:boolean; onClick:()=>void; label:string; badge:number; tone?:"success"|"warning"|"destructive" }) { const toneCls=tone==="success"?"bg-success/20 text-success":tone==="warning"?"bg-warning/20 text-warning":tone==="destructive"?"bg-destructive/20 text-destructive":"bg-secondary text-muted-foreground"; return <button onClick={onClick} className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${active?"border-primary/40 bg-primary/10 text-foreground":"border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>{label}<span className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${active?"bg-primary/20 text-primary":toneCls}`}>{badge}</span></button>; }
