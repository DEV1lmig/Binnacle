"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";
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
      <DialogContent
        style={{
          backgroundColor: C.surface,
          borderColor: C.border,
          borderRadius: 2,
          color: C.text,
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: FONT_HEADING,
              fontWeight: 300,
              color: C.text,
            }}
          >
            Report
          </DialogTitle>
          <DialogDescription
            style={{
              fontFamily: FONT_BODY,
              fontSize: 14,
              color: C.textMuted,
            }}
          >
            Tell us what&apos;s going on so a moderator can review it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12,
                color: C.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Reason
            </p>
            <Select value={reason} onValueChange={(value) => setReason(value as ReportReason)}>
              <SelectTrigger
                style={{
                  backgroundColor: C.bgAlt,
                  borderColor: C.border,
                  color: C.text,
                }}
              >
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
            <p
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12,
                color: C.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Description (optional)
            </p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any extra details..."
              className="w-full min-h-[96px] resize-none"
              style={{
                backgroundColor: C.bgAlt,
                borderColor: C.border,
                color: C.text,
                borderRadius: 2,
                fontSize: 14,
                fontFamily: FONT_BODY,
              }}
            />
            <style>{`
              .space-y-2 textarea::placeholder {
                color: ${C.textDim} !important;
              }
            `}</style>
          </div>

          {error ? (
            <p
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: C.red,
              }}
            >
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              backgroundColor: C.gold,
              color: "#FFFFFF",
              opacity: !canSubmit ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (canSubmit) e.currentTarget.style.backgroundColor = C.goldDim;
            }}
            onMouseLeave={(e) => {
              if (canSubmit) e.currentTarget.style.backgroundColor = C.gold;
            }}
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
