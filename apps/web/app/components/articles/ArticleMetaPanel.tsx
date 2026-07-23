"use client";

import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { X } from "lucide-react";
import { C, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";

export type ArticleType = "review" | "opinion" | "analysis";

const TYPE_OPTIONS: Array<{ value: ArticleType; label: string; description: string }> = [
  { value: "review", label: "Review", description: "A critique of a specific game" },
  { value: "opinion", label: "Opinion", description: "A take, hot or otherwise" },
  { value: "analysis", label: "Analysis", description: "A deeper dive into mechanics, design, or industry trends" },
];

const maxTags = 10;
const maxTagLength = 30;

type ArticleMetaPanelProps = {
  type: ArticleType | undefined;
  onTypeChange: (type: ArticleType | undefined) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  containsSpoilers: boolean;
  onSpoilersChange: (value: boolean) => void;
};

export function ArticleMetaPanel({
  type,
  onTypeChange,
  tags,
  onTagsChange,
  containsSpoilers,
  onSpoilersChange,
}: ArticleMetaPanelProps) {
  const [tagDraft, setTagDraft] = useState("");

  const addTag = () => {
    const trimmed = tagDraft.trim().slice(0, maxTagLength);
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setTagDraft("");
      return;
    }
    if (tags.length >= maxTags) return;

    onTagsChange([...tags, trimmed]);
    setTagDraft("");
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter((t) => t !== tag));
  };

  const labelStyle = {
    fontFamily: FONT_MONO,
    fontSize: 12,
    color: C.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p style={labelStyle}>Type (optional)</p>
        <RadioGroup
          value={type ?? ""}
          onValueChange={(value) => onTypeChange(value ? (value as ArticleType) : undefined)}
          className="grid gap-2"
        >
          {TYPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-start gap-3 p-3 rounded-sm cursor-pointer transition-colors"
              style={{
                border: `1px solid ${type === option.value ? C.gold : C.border}`,
                backgroundColor: type === option.value ? C.bloom : "transparent",
              }}
            >
              <RadioGroupItem value={option.value} id={`article-type-${option.value}`} className="mt-1" />
              <span>
                <span className="block" style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.text }}>
                  {option.label}
                </span>
                <span className="block" style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.textMuted }}>
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </section>

      <section className="space-y-2">
        <p style={labelStyle}>Tags ({tags.length}/{maxTags})</p>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-sm"
                style={{ backgroundColor: C.bgAlt, border: `1px solid ${C.border}`, color: C.text, fontFamily: FONT_MONO, fontSize: 12 }}
              >
                {tag}
                <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`} style={{ color: C.textDim }}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        {tags.length < maxTags ? (
          <Input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Add a tag and press Enter…"
            style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text, borderRadius: 2 }}
          />
        ) : null}
      </section>

      <section className="flex items-center justify-between gap-4 p-3 rounded-sm" style={{ border: `1px solid ${C.border}` }}>
        <div>
          <Label htmlFor="contains-spoilers" style={{ color: C.text, fontFamily: FONT_BODY, fontSize: 14 }}>
            Contains spoilers
          </Label>
          <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.textMuted }}>
            Readers will see a warning before the content is revealed.
          </p>
        </div>
        <Switch id="contains-spoilers" checked={containsSpoilers} onCheckedChange={onSpoilersChange} />
      </section>
    </div>
  );
}
