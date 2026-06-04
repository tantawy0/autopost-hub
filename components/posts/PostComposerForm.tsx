"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  Clock3,
  Eye,
  Hash,
  Info,
  Layers3,
  MessageSquareText,
  Save,
  Send,
  Sparkles,
  UserCheck,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import LoadingButton from "@/components/LoadingButton";
import ComposerPreview from "@/components/posts/ComposerPreview";
import FirstCommentField from "@/components/posts/FirstCommentField";
import MediaUploader from "@/components/posts/MediaUploader";
import PlatformSelector from "@/components/posts/PlatformSelector";
import SchedulePicker from "@/components/posts/SchedulePicker";
import { listSelectableDestinations } from "@/lib/channels";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { HASHTAG_SUGGESTIONS, TEMPLATE_SUGGESTIONS } from "@/lib/content-assist";
import { getPost, savePost } from "@/lib/posts";
import { supabase } from "@/lib/supabase";
import type { ConnectedAccountDTO, MediaAssetDTO, PostCardDTO, SavePostInput } from "@/lib/types";
import { validateDestinationMedia } from "@/lib/validation/media";
import {
  validatePostContent,
  validateScheduleTime,
  validateSelectableDestinations,
} from "@/lib/validation/scheduling";

interface PostComposerFormProps {
  postId?: string;
}

type ComposerPanel = "preview" | "templates" | "assistant";
type PostFormat = "Post" | "Reel" | "Story";
type AutosaveState = "saved" | "unsaved" | "saving";

const POST_FORMATS: PostFormat[] = ["Post", "Reel", "Story"];

const PLATFORM_LIMITS = {
  Instagram: { label: "Instagram", max: 2200, warning: "Reels and Stories need vertical 9:16 media for best results." },
  Facebook: { label: "Facebook", max: 63206, warning: "First comment publishing depends on Page permissions." },
  TikTok: { label: "TikTok", max: 2200, warning: "TikTok live publishing is not enabled in this release." },
  LinkedIn: { label: "LinkedIn", max: 3000, warning: "LinkedIn text publishing is enabled; media support is next." },
};

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

  return date.toISOString().slice(0, 16);
}

export default function PostComposerForm({ postId }: PostComposerFormProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [initialLoading, setInitialLoading] = useState(Boolean(postId));
  const [caption, setCaption] = useState("");
  const [firstComment, setFirstComment] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [media, setMedia] = useState<MediaAssetDTO | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaAssetDTO[]>([]);
  const [destinations, setDestinations] = useState<ConnectedAccountDTO[]>([]);
  const [selectedDestinationIds, setSelectedDestinationIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<"draft" | "schedule" | "upload" | "assistant" | null>(null);
  const [panel, setPanel] = useState<ComposerPanel>("preview");
  const [postFormat, setPostFormat] = useState<PostFormat>("Post");
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [approvalRequested, setApprovalRequested] = useState(false);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("saved");

  const markUnsaved = () => {
    setAutosaveState((current) => (current === "saving" ? current : "unsaved"));
  };

  const updateCaption = (value: string | ((current: string) => string)) => {
    setCaption(value);
    markUnsaved();
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [destinationData, post] = await Promise.all([
          listSelectableDestinations(),
          postId ? getPost(postId) : Promise.resolve<PostCardDTO | null>(null),
        ]);

        if (!active) return;

        setDestinations(destinationData);

        if (post) {
          setCaption(post.caption);
          setFirstComment(post.firstComment);
          setScheduleTime(toDateTimeLocal(post.scheduledFor));
          setInternalNotes(post.internalNotes ?? "");
          setApprovalRequested(Boolean(post.approvalRequested));
          setPostFormat(post.postFormat ?? "Post");
          const loadedMedia = post.media[0] ?? (post.imageUrl ? { url: post.imageUrl, mediaType: "unknown" as const } : null);
          setMedia(loadedMedia);
          setMediaItems(post.media.length > 0 ? post.media : loadedMedia ? [loadedMedia] : []);

          const matchingIds = destinationData
            .filter((destination) => post.platforms.includes(destination.platform))
            .map((destination) => destination.id);
          setSelectedDestinationIds(matchingIds);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load composer");
      } finally {
        if (active) setInitialLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [postId]);

  const selectedDestinations = useMemo(
    () => destinations.filter((destination) => selectedDestinationIds.includes(destination.id)),
    [destinations, selectedDestinationIds],
  );
  const activeLimit = useMemo(() => {
    const platform = selectedDestinations[0]?.platform ?? "Instagram";

    return PLATFORM_LIMITS[platform];
  }, [selectedDestinations]);
  const captionOverLimit = caption.length > activeLimit.max;
  const scheduleDisabledReason = useMemo(() => {
    if (!caption.trim() && mediaItems.length === 0) return "Add a caption or media before scheduling.";
    if (selectedDestinations.length === 0) return "Select at least one connected destination.";
    if (!scheduleTime) return "Choose a future schedule time.";
    if (captionOverLimit) return `${activeLimit.label} caption is over the character limit.`;

    return "";
  }, [activeLimit.label, caption, captionOverLimit, mediaItems.length, scheduleTime, selectedDestinations.length]);

  useEffect(() => {
    if (initialLoading || autosaveState !== "unsaved") return;

    const timeout = window.setTimeout(() => {
      setAutosaveState("saving");
      const payload = { caption, firstComment, scheduleTime, internalNotes, postFormat, updatedAt: new Date().toISOString() };

      queueMicrotask(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.access_token) {
            await fetch("/api/posts/autosave", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                postId,
                clientDraftId: postId ?? "new-post",
                payload,
              }),
            });
          }
        } finally {
          setAutosaveState("saved");
        }
      });
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [autosaveState, caption, firstComment, initialLoading, internalNotes, postFormat, postId, scheduleTime]);

  const buildPayload = (status: "Draft" | "Scheduled"): SavePostInput | null => {
    const primaryMedia = mediaItems[0] ?? media;
    const contentError = validatePostContent(caption, primaryMedia?.url ?? null);

    if (contentError) {
      toast.error(contentError);
      return null;
    }

    if (status === "Scheduled") {
      const scheduleError = validateScheduleTime(scheduleTime);

      if (scheduleError) {
        toast.error(scheduleError);
        return null;
      }

      const destinationError = validateSelectableDestinations(selectedDestinations);

      if (destinationError) {
        toast.error(destinationError);
        return null;
      }

      const mediaErrors = validateDestinationMedia(mediaItems.length > 0 ? mediaItems : primaryMedia ? [primaryMedia] : [], selectedDestinations);

      if (mediaErrors.length > 0) {
        toast.error(mediaErrors[0]);
        return null;
      }
    }

    return {
      postId,
      caption,
      firstComment,
      imageUrl: primaryMedia?.url ?? null,
      mediaAssets: mediaItems.length > 0 ? mediaItems : primaryMedia ? [primaryMedia] : [],
      platforms: selectedDestinations.map((destination) => destination.platform),
      status,
      scheduledFor: status === "Scheduled" ? new Date(scheduleTime).toISOString() : null,
      internalNotes,
      postFormat,
      approvalRequested,
    };
  };

  const handleSave = async (status: "Draft" | "Scheduled") => {
    const payload = buildPayload(status);

    if (!payload) return;

    setActionLoading(status === "Draft" ? "draft" : "schedule");

    try {
      await savePost(payload);
      toast.success(status === "Draft" ? "Draft saved" : "Post scheduled");
      router.push(status === "Draft" ? "/drafts" : "/calendar");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save post");
    } finally {
      setActionLoading(null);
    }
  };

  const applyTemplate = (template: string) => {
    updateCaption((current) => (current.trim() ? `${current.trim()}\n\n${template}` : template));
  };

  const applyAssistantPrompt = async () => {
    const prompt = assistantPrompt.trim();

    if (!prompt) {
      toast.message("Add a short brief first");
      return;
    }

    setActionLoading("assistant");

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: await getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ prompt, caption, postId }),
      });
      const body = (await response.json().catch(() => null)) as { suggestions?: string[]; message?: string } | null;
      const suggestion = body?.suggestions?.[0];

      if (!response.ok || !suggestion) {
        throw new Error(body?.message ?? "AI could not generate a draft.");
      }

      applyTemplate(suggestion);
      setAssistantPrompt("");
      toast.success("AI draft added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to generate AI draft");
    } finally {
      setActionLoading(null);
    }
  };

  const appendHashtag = (tag: string) => {
    updateCaption((current) => {
      const trimmed = current.trimEnd();

      return trimmed.includes(tag) ? current : `${trimmed}${trimmed ? " " : ""}${tag}`;
    });
  };

  const handleMediaItemsChange = (items: MediaAssetDTO[]) => {
    setMediaItems(items);
    setMedia(items[0] ?? null);
    markUnsaved();
  };

  if (initialLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="app-panel-soft rounded-3xl p-5">
          <div className="h-6 w-36 rounded-full shimmer-surface" />
          <div className="mt-5 h-56 rounded-3xl shimmer-surface" />
          <div className="mt-5 h-28 rounded-3xl shimmer-surface" />
        </div>
        <div className="app-panel-soft rounded-3xl p-5">
          <div className="h-5 w-28 rounded-full shimmer-surface" />
          <div className="mt-5 space-y-3">
            <div className="h-12 rounded-2xl shimmer-surface" />
            <div className="h-12 rounded-2xl shimmer-surface" />
            <div className="h-20 rounded-2xl shimmer-surface" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <div className="reference-glass relative flex flex-col gap-4 overflow-hidden rounded-2xl p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="premium-grid-mask pointer-events-none absolute inset-0 opacity-55" aria-hidden="true" />
        <div className="relative">
          <h1 className="text-3xl font-black text-white">
            {postId ? "Edit Studio" : "Cinematic Studio"}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Compose short-form ideas, shape the creative, preview the social surface, and schedule without breaking focus.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: `${selectedDestinations.length} destinations`, icon: Layers3 },
              { label: scheduleTime ? "Time selected" : "Choose time", icon: Clock3 },
              { label: mediaItems.length ? `${mediaItems.length} media` : "Media optional", icon: CheckCircle2 },
              { label: autosaveState === "saved" ? "Draft saved" : autosaveState === "saving" ? "Saving..." : "Unsaved", icon: Save },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <span
                  key={item.label}
                  className="inline-flex min-h-8 items-center gap-2 rounded-full bg-white/[0.055] px-3 text-xs font-bold text-zinc-300"
                >
                  <Icon size={14} className="text-sky-300" aria-hidden="true" />
                  {item.label}
                </span>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white/[0.055] px-4 text-sm font-semibold text-zinc-100 transition hover:bg-white/[0.085] focus:outline-none focus:ring-2 focus:ring-[#bde5ad]/55"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Dashboard
        </button>
      </div>

      <div className="reference-glass overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-fit rounded-2xl bg-white/[0.04] p-1">
            {POST_FORMATS.map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => {
                  setPostFormat(format);
                  markUnsaved();
                }}
                className={`min-h-9 rounded-xl px-3 text-sm font-bold transition ${
                  postFormat === format ? "reference-gradient-primary text-slate-950 shadow-[0_0_28px_rgb(79_156_255_/_0.16)]" : "text-zinc-400 hover:bg-white/7 hover:text-white"
                }`}
              >
                {format}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: "templates" as const, label: "Templates", icon: BookOpenText },
              { id: "assistant" as const, label: "AI Assistant", icon: Wand2 },
              { id: "preview" as const, label: "Preview", icon: Eye },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPanel(item.id)}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
                    panel === item.id ? "bg-sky-300/10 text-sky-200" : "text-zinc-400 hover:bg-white/7 hover:text-white"
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

      <div className="soft-divider" />
      <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <motion.section
          className="app-panel-soft space-y-5 rounded-3xl p-5 transition hover:border-white/15"
          whileHover={reduceMotion ? undefined : { y: -2 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="caption" className="text-sm font-semibold text-zinc-200">
                Caption
              </label>
              <span className="rounded-full bg-white/7 px-2 py-1 text-xs font-bold text-zinc-500">
                {caption.length}/{activeLimit.max} {activeLimit.label}
              </span>
            </div>
            <textarea
              id="caption"
              value={caption}
              onChange={(event) => updateCaption(event.target.value)}
              placeholder="Write the hook, story, and call to action..."
              className="silent-input mt-2 min-h-56 w-full resize-none rounded-3xl p-4 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#bde5ad]/50 focus:ring-2 focus:ring-[#bde5ad]/20"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => applyTemplate("Start with a sharper hook, name the benefit, then close with one clear call to action.")}
                className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-white/[0.045] px-3 text-xs font-bold text-zinc-300 transition hover:bg-white/8"
              >
                <Sparkles size={14} aria-hidden="true" />
                Hook
              </button>
              <button
                type="button"
                onClick={() => appendHashtag(HASHTAG_SUGGESTIONS[0])}
                className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-white/[0.045] px-3 text-xs font-bold text-zinc-300 transition hover:bg-white/8"
              >
                <Hash size={14} aria-hidden="true" />
                Hashtags
              </button>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div
                className={`rounded-lg border p-3 text-xs leading-5 ${
                  captionOverLimit
                    ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
                    : "border-white/8 bg-white/[0.035] text-zinc-400"
                }`}
              >
                <div className="flex items-start gap-2">
                  <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{captionOverLimit ? `${activeLimit.label} limit exceeded.` : activeLimit.warning}</span>
                </div>
              </div>
              <div className="rounded-2xl bg-white/[0.035] p-3">
                <p className="text-xs font-black uppercase text-zinc-500">Hashtag suggestions</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {HASHTAG_SUGGESTIONS.slice(0, 4).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => appendHashtag(tag)}
                      className="rounded-full bg-white/8 px-2 py-1 text-xs font-bold text-zinc-300 transition hover:bg-[#bde5ad]/15 hover:text-[#d8ffd0]"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <MediaUploader
            value={media}
            onChange={(value) => {
              setMedia(value);
              markUnsaved();
            }}
            items={mediaItems}
            onItemsChange={handleMediaItemsChange}
            loading={actionLoading === "upload"}
            setLoading={(value) => setActionLoading(value ? "upload" : null)}
          />

          <div>
            <label className="text-sm font-semibold text-zinc-200">First comment</label>
            <div className="mt-2">
              <FirstCommentField
                value={firstComment}
                onChange={(value) => {
                  setFirstComment(value);
                  markUnsaved();
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div>
              <label htmlFor="internal-notes" className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                <MessageSquareText size={16} aria-hidden="true" />
                Internal notes
              </label>
              <textarea
                id="internal-notes"
                value={internalNotes}
                onChange={(event) => {
                  setInternalNotes(event.target.value);
                  markUnsaved();
                }}
                placeholder="Notes for your team or client. Not published."
                className="silent-input mt-2 min-h-24 w-full resize-none rounded-2xl p-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#bde5ad]/50 focus:ring-2 focus:ring-[#bde5ad]/20"
              />
            </div>
            <div className="rounded-3xl bg-white/[0.035] p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#bde5ad]/12 text-[#d8ffd0]">
                  <UserCheck size={17} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-black text-white">Approval request</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Store review intent with the draft so approval workflows can pick it up.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setApprovalRequested((value) => !value);
                  markUnsaved();
                  toast.message(approvalRequested ? "Approval request removed" : "Approval request marked");
                }}
                className={`mt-4 min-h-10 w-full rounded-lg px-3 text-sm font-black transition ${
                  approvalRequested
                    ? "reference-gradient-primary text-slate-950"
                    : "bg-white/[0.055] text-zinc-200 hover:bg-white/8"
                }`}
              >
                {approvalRequested ? "Approval requested" : "Request approval"}
              </button>
            </div>
          </div>
        </motion.section>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:h-fit">
          <motion.section
            className="app-panel-soft space-y-5 rounded-3xl p-5 transition hover:border-white/15"
            initial={reduceMotion ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div>
              <h2 className="text-lg font-bold text-white">Publish settings</h2>
              <p className="mt-1 text-sm text-zinc-400">Select live destinations and schedule time.</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-200">Destinations</p>
              <PlatformSelector
                destinations={destinations}
                selectedIds={selectedDestinationIds}
                onChange={(ids) => {
                  setSelectedDestinationIds(ids);
                  markUnsaved();
                }}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-200">Schedule time</p>
              <SchedulePicker
                value={scheduleTime}
                onChange={(value) => {
                  setScheduleTime(value);
                  markUnsaved();
                }}
              />
            </div>

            <div className="grid gap-3">
              <LoadingButton
                loading={actionLoading === "schedule"}
                onClick={() => handleSave("Scheduled")}
                text="Schedule Post"
                loadingText="Scheduling..."
                disabled={Boolean(scheduleDisabledReason)}
                className="silent-button min-h-11 rounded-2xl px-4 text-sm font-black"
              />
              {scheduleDisabledReason ? (
                <p className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
                  {scheduleDisabledReason}
                </p>
              ) : null}
              <LoadingButton
                loading={actionLoading === "draft"}
                onClick={() => handleSave("Draft")}
                text="Save Draft"
                loadingText="Saving..."
                className="min-h-11 rounded-2xl bg-white/[0.055] px-4 text-sm font-semibold text-white hover:bg-white/8"
              />
              <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <Send size={13} aria-hidden="true" />
                  Validated before scheduling
                </span>
                <span className="inline-flex items-center gap-1">
                  <Save size={13} aria-hidden="true" />
                  Drafts stay editable
                </span>
              </div>
            </div>
          </motion.section>

          <AnimatePresence mode="wait">
            {panel === "preview" ? (
              <motion.div
                key="preview"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <ComposerPreview
                  caption={caption}
                  firstComment={firstComment}
                  media={media}
                  mediaItems={mediaItems}
                  selectedDestinations={selectedDestinations}
                  scheduleTime={scheduleTime}
                  postFormat={postFormat}
                />
              </motion.div>
            ) : panel === "templates" ? (
              <motion.section
                key="templates"
                className="glass-card rounded-3xl p-4"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-black uppercase text-zinc-300">Templates</h2>
                  <BookOpenText size={18} className="text-sky-300" aria-hidden="true" />
                </div>
                <div className="mt-4 space-y-3">
                  {TEMPLATE_SUGGESTIONS.map((template) => (
                    <button
                      key={template.title}
                      type="button"
                      onClick={() => applyTemplate(template.body)}
                      className="w-full rounded-2xl bg-white/[0.035] p-4 text-left transition hover:bg-[#bde5ad]/8"
                    >
                      <p className="font-bold text-white">{template.title}</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">{template.body}</p>
                    </button>
                  ))}
                </div>
              </motion.section>
            ) : (
              <motion.section
                key="assistant"
                className="glass-card rounded-3xl p-4"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <div className="flex items-center gap-2 text-sky-300">
                  <Wand2 size={18} aria-hidden="true" />
                  <h2 className="text-sm font-black uppercase">AI Assistant</h2>
                </div>
                <label className="mt-4 block text-sm font-semibold text-zinc-200" htmlFor="assistant-brief">
                  What should this post say?
                </label>
                <textarea
                  id="assistant-brief"
                  value={assistantPrompt}
                  onChange={(event) => setAssistantPrompt(event.target.value)}
                  placeholder="Promote a product, announce a drop, or summarize an update."
                  className="silent-input mt-2 min-h-36 w-full resize-none rounded-2xl p-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#bde5ad]/50 focus:ring-2 focus:ring-[#bde5ad]/20"
                />
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Adds a structured draft to the caption. Review before scheduling.
                </p>
                <button
                  type="button"
                  onClick={() => void applyAssistantPrompt()}
                  disabled={actionLoading === "assistant"}
                  className="silent-button mt-4 inline-flex min-h-10 items-center gap-2 rounded-2xl px-4 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-[#d8ffd0]/70 disabled:opacity-60"
                >
                  {actionLoading === "assistant" ? <span className="silent-loader" aria-hidden="true" /> : <Wand2 size={16} aria-hidden="true" />}
                  {actionLoading === "assistant" ? "Generating..." : "Generate draft"}
                </button>
              </motion.section>
            )}
          </AnimatePresence>
        </aside>
      </div>
      </div>
    </motion.div>
  );
}
