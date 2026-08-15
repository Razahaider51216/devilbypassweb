import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { adminSaveSetting } from "@/lib/admin.functions";
import { getSiteBanner, uploadSiteBanner, BANNER_SETTING_KEY } from "@/lib/banner.functions";
import type { Copy } from "@/lib/i18n";
import type { Extra } from "@/lib/i18n-extra";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_WIDTH = 1920;

/** Downscale + re-encode to JPEG so the stored banner stays around 1MB. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob && blob.size <= 1024 * 1024) return blob;
    if (quality === 0.4 && blob) return blob;
  }
  throw new Error("Compression failed");
}

export function BannerTab({
  copy,
  x,
  btn,
  btnSolid,
}: {
  copy: Copy;
  x: Extra;
  btn: string;
  btnSolid: string;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const fetchBanner = useServerFn(getSiteBanner);
  const sendBanner = useServerFn(uploadSiteBanner);
  const saveSetting = useServerFn(adminSaveSetting);

  const banner = useQuery({ queryKey: ["site-banner"], queryFn: () => fetchBanner() });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_INPUT_BYTES) throw new Error(x.bannerTooLarge);
      const blob = await compress(file);
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error("Unable to read image"));
        reader.readAsDataURL(blob);
      });
      await sendBanner({ data: { imageBase64, mimeType: "image/jpeg" } });
    },
    onSuccess: () => {
      toast.success(x.saved);
      qc.invalidateQueries({ queryKey: ["site-banner"] });
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : copy.common.error),
    onSettled: () => setBusy(false),
  });

  const clear = useMutation({
    mutationFn: () => saveSetting({ data: { key: BANNER_SETTING_KEY, value: "" } }),
    onSuccess: () => {
      toast.success(x.saved);
      qc.invalidateQueries({ queryKey: ["site-banner"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : copy.common.error),
  });

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest">{x.banner}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{x.bannerHint}</p>

        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-background">
          {banner.data?.url ? (
            <img src={banner.data.url} alt={x.bannerCurrent} className="h-40 w-full object-cover" />
          ) : (
            <p className="p-6 text-center text-[11px] text-muted-foreground">{x.bannerNone}</p>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            upload.mutate(file);
          }}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => inputRef.current?.click()} className={btnSolid}>
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ImagePlus className="h-3 w-3" />
            )}
            {busy ? x.uploading : x.bannerUpload}
          </button>
          {banner.data?.url ? (
            <button disabled={clear.isPending} onClick={() => clear.mutate()} className={btn}>
              <Trash2 className="h-3 w-3" /> {x.bannerRemove}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
