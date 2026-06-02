"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Image as ImageIcon, Search, Trash2, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImageTrail } from "@/components/copied-ui/effects/ImageTrail";
import { SkeletonMediaGrid } from "@/components/copied-ui/Skeletons";
import MediaPreview from "@/components/posts/MediaPreview";
import { deleteMediaAsset, listMediaAssets, uploadMediaAsset } from "@/lib/posts";
import type { MediaAssetDTO } from "@/lib/types";

export default function Media() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<MediaAssetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const load = async () => {
    try { setAssets(await listMediaAssets()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load media"); }
    finally { setLoading(false); }
  };
  useEffect(() => { queueMicrotask(() => void load()); }, []);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      for (const file of Array.from(files)) await uploadMediaAsset(file);
      toast.success("Media uploaded");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed"); }
  };
  const remove = async (asset: MediaAssetDTO) => {
    try { await deleteMediaAsset(asset); toast.success("Media deleted"); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to delete media"); }
  };
  const visible = useMemo(() => assets.filter((asset) => {
    const matchesType = filter === "All" || (filter === "Images" && asset.mediaType === "image") || (filter === "Videos" && asset.mediaType === "video");
    return matchesType && asset.url.toLowerCase().includes(query.toLowerCase());
  }), [assets, filter, query]);

  return (
    <div className="space-y-5">
      <input ref={inputRef} type="file" className="hidden" multiple accept="image/*,video/*" onChange={(event) => void upload(event.target.files)} />
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div><h1 className="font-display text-3xl font-bold tracking-tight">Media Library</h1><p className="text-sm text-muted-foreground">Reusable assets for every post.</p></div>
        <Button onClick={() => inputRef.current?.click()} className="bg-gradient-primary text-primary-foreground shadow-glow"><Upload className="mr-1.5 h-4 w-4" /> Upload</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assets..." className="h-10 w-full rounded-xl border border-border bg-secondary/60 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" /></div>
        <Button variant="outline" size="sm" className="border-border"><Filter className="mr-1.5 h-3.5 w-3.5" /> Tags</Button>
        {["All","Images","Videos"].map((name) => <button key={name} onClick={() => setFilter(name)} className={`px-3 rounded-xl text-xs font-medium border ${filter === name ? "border-primary/40 bg-primary/15 text-foreground" : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"}`}>{name}</button>)}
      </div>
      <button onClick={() => inputRef.current?.click()} className="w-full rounded-2xl border-2 border-dashed border-border bg-secondary/20 py-10 text-center hover:bg-secondary/30 transition"><Upload className="mx-auto h-6 w-6 text-muted-foreground" /><div className="mt-2 text-sm font-semibold">Drop files here or click to upload</div><div className="text-xs text-muted-foreground">PNG, JPG, MP4 up to 200MB</div></button>
      {loading ? <SkeletonMediaGrid /> : <ImageTrail><div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">{visible.map((asset) => <div key={asset.id ?? asset.url} data-trail-src={asset.url} className="group relative aspect-square rounded-xl overflow-hidden ring-1 ring-border hover-lift cursor-pointer"><MediaPreview media={asset} className="absolute inset-0" /><div className="absolute top-2 left-2 grid h-6 w-6 place-items-center rounded-md bg-background/70 backdrop-blur text-[10px]">{asset.mediaType === "video" ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}</div>{asset.id ? <button onClick={() => void remove(asset)} className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-md bg-background/70 text-muted-foreground opacity-0 backdrop-blur transition group-hover:opacity-100 hover:text-destructive" aria-label="Delete media"><Trash2 className="h-3 w-3" /></button> : null}<div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition"><div className="text-[10px] truncate">{asset.storagePath?.split("/").pop() ?? "media asset"}</div></div></div>)}</div></ImageTrail>}
      {!loading && !visible.length ? <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">No media assets yet.</div> : null}
    </div>
  );
}
