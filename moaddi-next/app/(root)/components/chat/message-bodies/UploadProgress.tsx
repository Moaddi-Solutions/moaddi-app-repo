"use client";

import { Progress } from "@/../components/ui/progress";
import { AlertCircle, Loader2, RefreshCw, X } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Overlaid on a media bubble while its upload is in flight, or offering
 * retry/discard once it has failed. A plain width-percentage bar rather than
 * a composed slider primitive — the only requirement here is "show a
 * fraction," which does not need more than that.
 */
export function UploadProgress({
  status,
  progress,
  onRetry,
  onDiscard,
}: {
  status: "uploading" | "failed";
  progress?: number;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const t = useTranslations("Chat");

  if (status === "uploading") {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/35">
        <div className="w-3/4 max-w-40">
          <Progress
            value={Math.round((progress ?? 0) * 100)}
            className="h-1.5 bg-white/30 [&_[data-slot=progress-indicator]]:bg-white"
          />
        </div>
        <Loader2
          className="absolute size-5 animate-spin text-white"
          aria-hidden="true"
        />
        <span className="sr-only">{t("media.uploading")}</span>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 text-white">
      <AlertCircle className="size-5" aria-hidden="true" />
      <span className="text-xs font-semibold">{t("media.uploadFailed")}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          {t("media.retry")}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold"
        >
          <X className="size-3.5" aria-hidden="true" />
          {t("media.discard")}
        </button>
      </div>
    </div>
  );
}
