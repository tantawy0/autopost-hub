"use client";

import { useMemo } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, useReducedMotion } from "framer-motion";
import { GripVertical, ImagePlus, Upload, X } from "lucide-react";
import { toast } from "sonner";

import MediaPreview from "@/components/posts/MediaPreview";
import type { MediaAssetDTO } from "@/lib/types";
import { uploadMediaAsset } from "@/lib/posts";
import { validateMediaFile } from "@/lib/validation/media";

interface MediaUploaderProps {
  value: MediaAssetDTO | null;
  onChange: (value: MediaAssetDTO | null) => void;
  items?: MediaAssetDTO[];
  onItemsChange?: (items: MediaAssetDTO[]) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
}

function mediaKey(item: MediaAssetDTO, index: number) {
  return item.id ?? `${item.url}-${index}`;
}

function SortableMediaTile({
  item,
  index,
  onRemove,
}: {
  item: MediaAssetDTO;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: mediaKey(item, index),
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-card group relative overflow-hidden rounded-2xl ${
        isDragging ? "z-10 opacity-80 shadow-[0_28px_80px_rgb(189_229_173_/_0.16)]" : ""
      }`}
    >
      <MediaPreview media={item} className="aspect-square w-full" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/65 to-transparent p-2">
        <button
          type="button"
          className="flex h-7 w-7 cursor-grab items-center justify-center rounded-lg bg-black/45 text-white/80 backdrop-blur transition hover:bg-black/70"
          aria-label={`Reorder media ${index + 1}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={15} aria-hidden="true" />
        </button>
        <span className="rounded-full bg-black/50 px-2 py-1 text-[10px] font-black text-white">
          {index + 1}
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-md bg-black/60 text-white opacity-0 backdrop-blur transition hover:bg-rose-500 group-hover:opacity-100"
        aria-label="Remove media"
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function MediaUploader({
  value,
  onChange,
  items,
  onItemsChange,
  loading,
  setLoading,
}: MediaUploaderProps) {
  const reduceMotion = useReducedMotion();
  const mediaItems = useMemo(() => items ?? (value ? [value] : []), [items, value]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const uploadFiles = async (files: File[]) => {
    const remainingSlots = 10 - mediaItems.length;
    const selectedFiles = files.slice(0, remainingSlots);

    if (selectedFiles.length === 0) {
      toast.message("Carousel supports up to 10 media items");
      return;
    }

    const validationError = selectedFiles.map(validateMediaFile).find(Boolean);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      const uploaded = [];

      for (const file of selectedFiles) {
        uploaded.push(await uploadMediaAsset(file));
      }

      const nextItems = [...mediaItems, ...uploaded];
      onItemsChange?.(nextItems);
      onChange(nextItems[0] ?? null);
      toast.success(uploaded.length > 1 ? `${uploaded.length} media items uploaded` : "Media uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Media upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await uploadFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    await uploadFiles(Array.from(event.dataTransfer.files ?? []));
  };

  const handleRemove = (index: number) => {
    const nextItems = mediaItems.filter((_, itemIndex) => itemIndex !== index);
    onItemsChange?.(nextItems);
    onChange(nextItems[0] ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = mediaItems.findIndex((item, index) => mediaKey(item, index) === active.id);
    const newIndex = mediaItems.findIndex((item, index) => mediaKey(item, index) === over.id);

    if (oldIndex < 0 || newIndex < 0) return;

    const nextItems = arrayMove(mediaItems, oldIndex, newIndex);
    onItemsChange?.(nextItems);
    onChange(nextItems[0] ?? null);
    toast.message("Media order updated");
  };

  return (
    <motion.div
      className="premium-cta-card rounded-3xl border border-dashed border-white/10 bg-white/[0.035] p-4 transition hover:border-[#bde5ad]/28 hover:bg-white/[0.052]"
      whileHover={reduceMotion ? undefined : { y: -1 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      onDrop={handleDrop}
      onDragOver={(event) => event.preventDefault()}
    >
      {mediaItems.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-white">Motion media deck</p>
              <p className="mt-1 text-xs text-zinc-500">Drag to reorder. Keep the strongest frame first.</p>
            </div>
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-2xl bg-white/[0.055] px-3 text-sm font-bold text-zinc-200 transition hover:bg-white/8">
              <ImagePlus size={16} aria-hidden="true" />
              Add
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleUpload}
                className="sr-only"
              />
            </label>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={mediaItems.map((item, index) => mediaKey(item, index))}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {mediaItems.map((item, index) => (
                  <SortableMediaTile
                    key={mediaKey(item, index)}
                    item={item}
                    index={index}
                    onRemove={() => handleRemove(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="rounded-2xl border border-sky-300/15 bg-sky-300/8 p-3 text-xs leading-5 text-sky-100">
            Instagram carousel publishing uses the first saved media in this release; full multi-asset publishing can plug into the same UI later.
          </div>
        </div>
      ) : (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl text-center transition hover:bg-white/[0.03]">
          <div className="premium-grid-mask pointer-events-none absolute inset-0 opacity-45" aria-hidden="true" />
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#bde5ad]/10 text-[#d8ffd0] shadow-[0_0_42px_rgb(189_229_173_/_0.12)]">
            <Upload size={24} aria-hidden="true" />
          </span>
          <span className="font-semibold text-white">Drop the reel, carousel, or hero frame</span>
          <span className="mt-1 text-sm text-zinc-400">Images and videos up to 200 MB</span>
          <span className="mt-1 text-xs font-semibold text-zinc-600">Drag and drop, or select a file</span>
          <label className="mt-4 inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15">
            {loading ? "Uploading..." : "Choose file"}
            <input type="file" multiple accept="image/*,video/*" onChange={handleUpload} disabled={loading} className="sr-only" />
          </label>
        </div>
      )}
    </motion.div>
  );
}
