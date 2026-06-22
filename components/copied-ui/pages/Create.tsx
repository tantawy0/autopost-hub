"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bookmark,
  Calendar,
  Hash,
  Heart,
  Image as ImageIcon,
  Link2,
  MessageCircle,
  Save,
  Send,
  Smile,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { ButtonWithBadge } from "@/components/copied-ui/effects/ButtonWithBadge";
import { PlatformBadge } from "@/components/copied-ui/PlatformBadge";
import { SkeletonLine } from "@/components/copied-ui/Skeletons";
import MediaPreview from "@/components/posts/MediaPreview";
import { listSelectableDestinations } from "@/lib/channels";
import { getClientAuthHeaders } from "@/lib/client-auth";
import {
  getActivePreviewPlatform,
  getComposerPreviewPlatforms,
  getUniqueDestinationPlatforms,
} from "@/lib/composer-platforms";
import { getPost, publishPostClient, savePost, uploadMediaAsset } from "@/lib/posts";
import { supabase } from "@/lib/supabase";
import type { ConnectedAccountDTO, MediaAssetDTO } from "@/lib/types";
import { toUiPlatform, type UiPlatform } from "@/lib/ui-repo-adapters";
import { useUiStore } from "@/lib/ui-store";
import { getPageCopy, getPlatformName } from "@/lib/page-copy";

type CreateProps = {
  postId?: string;
};

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

  return date.toISOString().slice(0, 16);
}

export default function Create({ postId }: CreateProps = {}) {
  const locale = useUiStore((state) => state.locale);
  const copy = getPageCopy(locale);
  const t = copy.create;
  const common = copy.common;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [destinations, setDestinations] = useState<ConnectedAccountDTO[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [activePreview, setActivePreview] = useState<UiPlatform>("instagram");
  const [media, setMedia] = useState<MediaAssetDTO[]>([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [busy, setBusy] = useState("");
  const [autosave, setAutosave] = useState<"saved" | "saving">("saved");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [items, post] = await Promise.all([
          listSelectableDestinations(),
          postId ? getPost(postId) : Promise.resolve(null),
        ]);

        if (!active) return;

        setDestinations(items);

        if (post) {
          setCaption(post.caption);
          setScheduleTime(toDateTimeLocal(post.scheduledFor));
          setMedia(post.media);
          setSelected(
            items
              .filter((item) => post.platforms.includes(item.platform))
              .map((item) => item.id),
          );
        } else {
          setSelected(items.map((item) => item.id));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t.loadError);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [postId]);

  useEffect(() => {
    if (loading) return;

    let active = true;
    const timer = window.setTimeout(async () => {
      setAutosave("saving");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token && active) {
        await fetch("/api/posts/autosave", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientDraftId: postId ?? "new-post",
            postId: postId ?? null,
            payload: { caption, scheduleTime, updatedAt: new Date().toISOString() },
          }),
        }).catch(() => undefined);
      }

      if (active) setAutosave("saved");
    }, 900);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [caption, loading, postId, scheduleTime]);

  const selectedDestinations = useMemo(
    () => destinations.filter((item) => selected.includes(item.id)),
    [destinations, selected],
  );
  const selectedPlatforms = useMemo(
    () => getUniqueDestinationPlatforms(selectedDestinations),
    [selectedDestinations],
  );
  const previewPlatforms = useMemo(
    () => getComposerPreviewPlatforms(selectedDestinations),
    [selectedDestinations],
  );
  const activePreviewPlatform = getActivePreviewPlatform(activePreview, previewPlatforms);
  const activePreviewDestinations = activePreviewPlatform
    ? selectedDestinations.filter((item) => toUiPlatform(item.platform) === activePreviewPlatform)
    : [];
  const activePreviewDestination = activePreviewDestinations[0];
  const activePreviewName = activePreviewDestination?.accountName ?? t.noChannelSelected;
  const charLimit = activePreviewPlatform === "linkedin" ? 3000 : 2200;
  const overLimit = caption.length > charLimit;

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;

    setBusy("upload");
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadMediaAsset(file);
        setMedia((current) => [...current, uploaded]);
      }
      toast.success(t.mediaUploaded);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.uploadFailed);
    } finally {
      setBusy("");
    }
  };

  const persist = async (status: "Draft" | "Scheduled", publish = false) => {
    if (!caption.trim() && !media.length) {
      toast.error(t.requireContent);
      return;
    }
    if (!selectedDestinations.length) {
      toast.error(t.requireDestination);
      return;
    }
    if (status === "Scheduled" && !scheduleTime) {
      toast.error(t.requireTime);
      return;
    }

    setBusy(publish ? "publish" : status);
    try {
      const post = await savePost({
        postId,
        caption,
        firstComment: "",
        imageUrl: media[0]?.url ?? null,
        mediaAssets: media,
        platforms: selectedPlatforms,
        destinationAccountIds: selected,
        status,
        scheduledFor: status === "Scheduled" ? new Date(scheduleTime).toISOString() : null,
      });

      if (publish) {
        await publishPostClient(post.id, selectedDestinations);
        toast.success(t.published);
        router.push("/published");
      } else {
        toast.success(status === "Draft" ? t.draftSaved : t.scheduled);
        router.push(status === "Draft" ? "/queue" : "/calendar");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.saveFailed);
    } finally {
      setBusy("");
    }
  };

  const rewrite = async () => {
    setBusy("ai");
    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: await getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          prompt: t.aiRewritePrompt,
          caption,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        suggestions?: string[];
        message?: string;
      } | null;

      if (!response.ok || !body?.suggestions?.[0]) {
        throw new Error(body?.message ?? t.aiRewriteFailed);
      }

      setCaption(body.suggestions[0]);
      toast.success(t.aiRewriteAdded);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.aiRewriteFailed);
    } finally {
      setBusy("");
    }
  };

  const appendToCaption = (value: string) => {
    setCaption((current) => `${current}${current.trim() ? "\n\n" : ""}${value}`);
  };

  const addLink = () => {
    const value = window.prompt(t.linkPrompt);
    if (!value) return;
    appendToCaption(value.trim());
  };

  const runSuggestion = async (suggestion: string) => {
    setBusy("ai");
    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: await getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          prompt: t.suggestionPrompt(suggestion),
          caption,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        suggestions?: string[];
        message?: string;
      } | null;

      if (!response.ok || !body?.suggestions?.[0]) {
        throw new Error(body?.message ?? t.suggestionFailed);
      }

      appendToCaption(body.suggestions[0]);
      toast.success(t.suggestionAdded);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.suggestionFailed);
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <SkeletonLine className="h-7 w-48" />
          <SkeletonLine className="h-3 w-72" />
        </div>
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3 glass rounded-2xl p-5 space-y-3">
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="h-40 w-full" />
          </div>
          <div className="lg:col-span-2 glass rounded-2xl p-5">
            <SkeletonLine className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,video/*"
        onChange={(event) => void upload(event.target.files)}
      />
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {postId ? t.editTitle : t.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t.subtitle("")} <span className="text-success">{autosave === "saving" ? t.saving : t.saved}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonWithBadge onClick={() => void persist("Draft")} variant="outline" disabled={Boolean(busy)}>
            <Save className="h-4 w-4" /> {t.saveDraft}
          </ButtonWithBadge>
          <ButtonWithBadge
            onClick={() => void persist("Scheduled")}
            variant="outline"
            badge={t.ready}
            badgeVariant="success"
            disabled={Boolean(busy)}
          >
            <Calendar className="h-4 w-4" /> {t.schedule}
          </ButtonWithBadge>
          <ButtonWithBadge
            onClick={() => void persist("Draft", true)}
            variant="primary"
            badge={t.selectedBadge(selected.length)}
            badgeVariant="ai"
            disabled={Boolean(busy) || !selected.length}
          >
            <Send className="h-4 w-4" /> {common.publishNow}
          </ButtonWithBadge>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <div className="glass rounded-2xl p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {common.channels}
            </div>
            <div className="flex flex-wrap gap-2">
              {destinations.map((destination) => {
                const platform = toUiPlatform(destination.platform);
                const on = selected.includes(destination.id);
                return (
                  <button
                    key={destination.id}
                    onClick={() =>
                      setSelected((current) =>
                        on ? current.filter((id) => id !== destination.id) : [...current, destination.id],
                      )
                    }
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      on
                        ? "border-primary/40 bg-primary/15 text-foreground"
                        : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <PlatformBadge platform={platform} size="xs" />
                    {destination.accountName}
                  </button>
                );
              })}
              {!destinations.length ? (
                <span className="text-xs text-muted-foreground">{t.noChannelToPublish}</span>
              ) : null}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              rows={8}
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed placeholder:text-muted-foreground focus:outline-none"
              placeholder={t.composerPlaceholder}
            />
            <div className="mt-3 flex items-center gap-1 text-muted-foreground">
              <ToolButton icon={ImageIcon} label={t.toolMedia} onClick={() => inputRef.current?.click()} />
              <ToolButton icon={Hash} label={t.toolHashtags} onClick={() => appendToCaption("#socialmedia #content #growth")} />
              <ToolButton icon={Link2} label={t.toolLink} onClick={addLink} />
              <ToolButton icon={Smile} label={t.toolEmoji} onClick={() => setCaption((current) => `${current} ✨`)} />
              <div className="ml-auto flex items-center gap-3 text-[11px]">
                <span className={overLimit ? "text-destructive font-semibold" : ""}>
                  {caption.length}/{charLimit}
                </span>
                <button
                  onClick={() => void rewrite()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent/15 px-2.5 py-1.5 text-accent font-semibold hover:bg-accent/25 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" /> {t.aiRewrite}
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(event) => setScheduleTime(event.target.value)}
              className="mt-3 h-10 w-full rounded-xl border border-border bg-secondary/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t.media}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {media.map((asset) => (
                <MediaPreview
                  key={asset.id ?? asset.url}
                  media={asset}
                  className="aspect-square rounded-xl ring-1 ring-border"
                />
              ))}
              <button
                onClick={() => inputRef.current?.click()}
                className="aspect-square rounded-xl border border-dashed border-border bg-secondary/30 grid place-items-center text-muted-foreground hover:bg-secondary/50 transition"
              >
                <div className="text-center">
                  <ImageIcon className="mx-auto h-5 w-5" />
                  <div className="mt-1 text-[10px]">{busy === "upload" ? common.uploading : common.upload}</div>
                </div>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-card p-5">
            <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-4 w-4" /> {t.aiSuggestions}
            </div>
            <div className="mt-3 grid gap-2">
              {t.suggestions.map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    disabled={busy === "ai"}
                    onClick={() => void runSuggestion(suggestion)}
                    className="text-left rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm hover:bg-secondary transition"
                  >
                    {suggestion}
                  </button>
                ),
              )}
            </div>
          </div>

          {!destinations.length ? (
            <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-warning">{t.connectFirstTitle}</div>
                <div className="text-muted-foreground text-xs mt-0.5">
                  {t.connectFirstBody}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div
            data-testid="composer-preview-tabs"
            data-active-platform={activePreviewPlatform ?? ""}
            className="flex gap-1 rounded-xl bg-secondary p-1"
          >
            {previewPlatforms.length ? (
              previewPlatforms.map((platform) => (
                <button
                  key={platform}
                  data-testid={`composer-preview-platform-${platform}`}
                  onClick={() => setActivePreview(platform)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition ${
                    activePreviewPlatform === platform
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <PlatformBadge platform={platform} size="xs" />
                  <span className="hidden md:inline">{getPlatformName(platform, locale)}</span>
                </button>
              ))
            ) : (
              <div className="w-full rounded-lg px-3 py-2 text-center text-xs text-muted-foreground">
                {t.previewEmpty}
              </div>
            )}
          </div>

          {activePreviewPlatform ? (
            <motion.div
              key={activePreviewPlatform}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong rounded-2xl p-4"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                {t.livePreview}
              </div>
              <div className="rounded-xl bg-background border border-border overflow-hidden">
                <div className="flex items-center gap-2 p-3 border-b border-border">
                  <PlatformBadge platform={activePreviewPlatform} size="md" />
                  <div>
                    <div className="text-sm font-semibold">{activePreviewName}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {getPlatformName(activePreviewPlatform, locale)}
                      {activePreviewDestinations.length > 1 ? ` - ${t.destinationCount(activePreviewDestinations.length)}` : ""}
                    </div>
                  </div>
                </div>
                {media[0] ? (
                  <MediaPreview media={media[0]} className="aspect-square" />
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-sky-500/30 via-cyan-500/25 to-indigo-500/25 ring-grid" />
                )}
                <div className="p-3">
                  {activePreviewPlatform === "instagram" ? (
                    <div className="flex gap-3 text-foreground/80">
                      <Heart className="h-5 w-5" />
                      <MessageCircle className="h-5 w-5" />
                      <Send className="h-5 w-5" />
                      <Bookmark className="h-5 w-5 ml-auto" />
                    </div>
                  ) : null}
                  <div className="mt-2 text-xs whitespace-pre-wrap">{caption}</div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="glass-strong rounded-2xl p-8 text-center text-sm text-muted-foreground">
              {t.noDestination}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
