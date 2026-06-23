"use client";

import { useMemo, useState, useCallback } from "react";
import {
  buildShareImagePath,
  type ShareCardOptions,
  type ShareCardFormat,
  type ShareCardAccent,
  SHARE_CARD_FORMATS,
  SHARE_CARD_ACCENTS,
  SHARE_ACCENT_COLORS,
  DEFAULT_SHARE_OPTIONS,
} from "@binnacle/shared-types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Switch } from "@/app/components/ui/switch";
import { Button } from "@/app/components/ui/button";
import {
  Download,
  Share2,
  Link as LinkIcon,
  Check,
  ImageIcon,
} from "lucide-react";

type ShareReviewModalProps = {
  reviewId: string;
  gameTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const formatLabels: Record<ShareCardFormat, string> = {
  story: "Story (9:16)",
  square: "Square (1:1)",
  wide: "Wide (OG)",
};

export function ShareReviewModal({
  reviewId,
  gameTitle,
  open,
  onOpenChange,
}: ShareReviewModalProps) {
  const [options, setOptions] = useState<ShareCardOptions>(DEFAULT_SHARE_OPTIONS);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const previewOptions = useMemo<ShareCardOptions>(
    () => ({
      ...options,
      format: options.format === "wide" ? "square" : options.format,
    }),
    [options]
  );

  const imageUrl = useMemo(
    () => buildShareImagePath(reviewId, previewOptions),
    [reviewId, previewOptions]
  );
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleFormat = useCallback((format: ShareCardFormat) => {
    setOptions((prev) => ({ ...prev, format }));
  }, []);

  const handleAccent = useCallback((accent: ShareCardAccent) => {
    setOptions((prev) => ({ ...prev, accent }));
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  }, [shareUrl]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const fullUrl = buildShareImagePath(reviewId, options);
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error("Failed to fetch image");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `binnacle-review-${reviewId}-${options.format}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("Failed to download image:", err);
    } finally {
      setDownloading(false);
    }
  }, [reviewId, options]);

  const handleShareImage = useCallback(async () => {
    setSharing(true);
    try {
      const fullUrl = buildShareImagePath(reviewId, options);
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error("Failed to fetch image");
      const blob = await response.blob();
      const file = new File([blob], `binnacle-review-${reviewId}.png`, {
        type: "image/png",
      });

      const shareData: ShareData = {
        title: `Review of ${gameTitle}`,
        text: `Check out this review of ${gameTitle}`,
        url: shareUrl,
        files: [file],
      };

      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: download + copy link
        await handleDownload();
        await handleCopyLink();
      }
    } catch (err) {
      console.error("Failed to share image:", err);
    } finally {
      setSharing(false);
    }
  }, [reviewId, options, gameTitle, shareUrl, handleDownload, handleCopyLink]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--bkl-color-text-primary)]">
            <ImageIcon className="w-5 h-5 text-[var(--bkl-color-accent-primary)]" />
            Share as image
          </DialogTitle>
          <DialogDescription className="text-[var(--bkl-color-text-secondary)]">
            Customize the look of your review card before sharing.
          </DialogDescription>
        </DialogHeader>

        {/* Preview */}
        <div className="flex justify-center">
          <div className="relative rounded-[var(--bkl-radius-md)] overflow-hidden border border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-primary)] max-h-[320px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`Share preview for ${gameTitle}`}
              className="max-h-[320px] w-auto object-contain"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Format */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--bkl-color-text-secondary)]">
              Format
            </label>
            <div className="flex gap-2">
              {SHARE_CARD_FORMATS.map((format) => (
                <button
                  key={format}
                  onClick={() => handleFormat(format)}
                  className={`flex-1 px-3 py-2 text-sm rounded-[var(--bkl-radius-sm)] border transition-colors ${
                    options.format === format
                      ? "bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)] border-[var(--bkl-color-accent-primary)]"
                      : "bg-[var(--bkl-color-bg-tertiary)] text-[var(--bkl-color-text-secondary)] border-[var(--bkl-color-border)] hover:text-[var(--bkl-color-text-primary)]"
                  }`}
                >
                  {formatLabels[format]}
                </button>
              ))}
            </div>
          </div>

          {/* Accent */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--bkl-color-text-secondary)]">
              Accent
            </label>
            <div className="flex gap-3">
              {SHARE_CARD_ACCENTS.map((accent) => (
                <button
                  key={accent}
                  onClick={() => handleAccent(accent)}
                  aria-label={`Select ${accent} accent`}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    options.accent === accent
                      ? "border-white scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: SHARE_ACCENT_COLORS[accent] }}
                />
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="show-text"
                className="text-sm text-[var(--bkl-color-text-secondary)]"
              >
                Show review text
              </label>
              <Switch
                id="show-text"
                checked={options.showText}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, showText: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="show-poster"
                className="text-sm text-[var(--bkl-color-text-secondary)]"
              >
                Show game poster
              </label>
              <Switch
                id="show-poster"
                checked={options.showPoster}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, showPoster: checked }))
                }
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={handleShareImage}
            disabled={sharing}
            className="w-full bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)] hover:bg-[var(--bkl-color-accent-hover)]"
          >
            <Share2 className="w-4 h-4 mr-2" />
            {sharing ? "Sharing..." : "Share image"}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)] hover:bg-[var(--bkl-color-bg-tertiary)]"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? "..." : "Download"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="flex-1 border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)] hover:bg-[var(--bkl-color-bg-tertiary)]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-[var(--bkl-color-feedback-success)]" />
                  Copied!
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Copy link
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
