"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";

type ReportTargetType = "user" | "review" | "comment";

type ReportReason = "spam" | "harassment" | "inappropriate" | "other";

const REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate" },
  { value: "other", label: "Other" },
];

type ReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
};

export function ReportDialog({ open, onOpenChange, targetType, targetId }: ReportDialogProps) {
  const createReport = useMutation(api.reports.create);

  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason("");
      setDescription("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const canSubmit = useMemo(() => {
    return Boolean(reason) && !isSubmitting;
  }, [isSubmitting, reason]);

  const handleSubmit = async () => {
    if (!reason || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await createReport({
        targetType,
        targetId,
        reason,
        description: description.trim() ? description.trim() : undefined,
      });
      onOpenChange(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to submit report";
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--bkl-color-text-primary)]">Report</DialogTitle>
          <DialogDescription className="text-[var(--bkl-color-text-secondary)]">
                  Tell us what's going on so a moderator can review it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-[var(--bkl-color-text-secondary)]">Reason</p>
            <Select value={reason} onValueChange={(value) => setReason(value as ReportReason)}>
              <SelectTrigger className="bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)]">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-[var(--bkl-color-text-secondary)]">Description (optional)</p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any extra details..."
              className="w-full bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)] placeholder:text-[var(--bkl-color-text-disabled)] rounded-[var(--bkl-radius-md)] min-h-[96px] resize-none"
              style={{ fontSize: "var(--bkl-font-size-sm)" }}
            />
          </div>

          {error ? (
            <p className="text-xs text-[var(--bkl-color-feedback-error)]">{error}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-hover)] text-[var(--bkl-color-bg-primary)] disabled:opacity-50"
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
