"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Textarea } from "@/app/components/ui/textarea";
import { MoreHorizontal } from "lucide-react";
import { ReportDialog } from "@/app/components/ReportDialog";
import { toast } from "sonner";
import { C, FONT_BODY, FONT_MONO } from "@/app/lib/design-system";

type CommentSectionProps = {
  reviewId: Id<"reviews">;
  onCountDelta?: (delta: number) => void;
  className?: string;
};

export function CommentSection({ reviewId, onCountDelta, className }: CommentSectionProps) {
  const currentUser = useQuery(api.users.current);

  const [limit, setLimit] = useState(20);
  const comments = useQuery(api.comments.listForReview, { reviewId, limit });

  const createComment = useMutation(api.comments.create);
  const updateComment = useMutation(api.comments.update);
  const removeComment = useMutation(api.comments.remove);

  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeEditId, setActiveEditId] = useState<Id<"comments"> | null>(null);
  const [editText, setEditText] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<Id<"comments"> | null>(null);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const count = comments?.length ?? 0;

  const canLoadMore = useMemo(() => {
    if (!comments) return false;
    if (limit >= 200) return false;
    return comments.length === limit;
  }, [comments, limit]);

  const handleCreate = async () => {
    const text = draft.trim();
    if (!text || !currentUser) return;

    setIsSubmitting(true);
    try {
      const result = await createComment({ reviewId, text });
      setDraft("");
      onCountDelta?.(1);

      if (result?.warning?.code === "mentions_truncated") {
        toast(result.warning.message);
      }
    } catch (error) {
      console.error("[CommentSection] Failed to create comment", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const beginEdit = (commentId: Id<"comments">, existingText: string) => {
    setActiveEditId(commentId);
    setEditText(existingText);
  };

  const cancelEdit = () => {
    setActiveEditId(null);
    setEditText("");
  };

  const saveEdit = async () => {
    if (!activeEditId) return;
    const text = editText.trim();
    if (!text) return;

    setIsSavingEdit(true);
    try {
      await updateComment({ commentId: activeEditId, text });
      cancelEdit();
    } catch (error) {
      console.error("[CommentSection] Failed to update comment", error);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (commentId: Id<"comments">) => {
    if (!window.confirm("Delete this comment?")) return;

    setIsDeletingId(commentId);
    try {
      await removeComment({ commentId });
      onCountDelta?.(-1);
    } catch (error) {
      console.error("[CommentSection] Failed to delete comment", error);
    } finally {
      setIsDeletingId(null);
    }
  };

  const textareaStyle = {
    backgroundColor: C.bgAlt,
    borderColor: C.border,
    color: C.text,
    borderRadius: 2,
    fontSize: 14,
    fontFamily: FONT_BODY,
  } as const;

  return (
    <div className={className}>
      {currentUser ? (
        <div className="mb-4">
          <div className="flex gap-3 mb-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
              <AvatarFallback
                style={{ backgroundColor: C.bgAlt, color: C.text }}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="Add a comment..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full min-h-[84px] resize-none"
                style={{
                  ...textareaStyle,
                  // @ts-expect-error CSS custom property for placeholder
                  "--tw-placeholder-opacity": 1,
                }}
              />
              <style>{`
                .comment-textarea::placeholder { color: ${C.textDim}; }
              `}</style>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={!draft.trim() || isSubmitting}
              className="text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: C.gold,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.goldDim; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.gold; }}
            >
              Post
            </Button>
          </div>
        </div>
      ) : null}

      {!comments ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton
              key={i}
              className="h-20"
              style={{ backgroundColor: C.bgAlt }}
            />
          ))}
        </div>
      ) : count === 0 ? (
        <p
          className="text-center py-6"
          style={{
            color: C.textDim,
            fontFamily: FONT_BODY,
            fontSize: 14,
          }}
        >
          No comments yet.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const isEditing = activeEditId === comment._id;

            return (
              <div
                key={comment._id}
                className="pb-4 last:border-b-0 last:pb-0"
                style={{ borderBottom: `1px solid ${C.border}` }}
              >
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={comment.author.avatarUrl} alt={comment.author.name} />
                    <AvatarFallback
                      style={{ backgroundColor: C.bgAlt, color: C.text }}
                    >
                      {comment.author.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p
                        style={{
                          color: C.text,
                          fontFamily: FONT_BODY,
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      >
                        {comment.author.name}
                      </p>
                      <span style={{ color: C.textDim }}>&#8226;</span>
                      <p
                        style={{
                          color: C.textDim,
                          fontFamily: FONT_MONO,
                          fontSize: 11,
                        }}
                      >
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </p>
                      <div className="ml-auto flex items-center gap-2">
                        {comment.isAuthor ? (
                          <span
                            style={{
                              color: C.textDim,
                              fontFamily: FONT_MONO,
                              fontSize: 11,
                            }}
                          >
                            You
                          </span>
                        ) : null}

                        {currentUser && !comment.isAuthor ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  setReportTargetId(comment._id);
                                  setReportOpen(true);
                                }}
                              >
                                Report
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full min-h-[84px] resize-none"
                          style={textareaStyle}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={cancelEdit}>
                            Cancel
                          </Button>
                          <Button
                            onClick={saveEdit}
                            disabled={!editText.trim() || isSavingEdit}
                            className="text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: C.gold }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.goldDim; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.gold; }}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p
                          style={{
                            color: C.textMuted,
                            fontFamily: FONT_BODY,
                            fontSize: 14,
                            fontWeight: 300,
                            lineHeight: 1.6,
                          }}
                        >
                          {comment.text}
                        </p>
                        {comment.isAuthor ? (
                          <div className="mt-2 flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => beginEdit(comment._id, comment.text)}
                              className="h-8"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleDelete(comment._id)}
                              disabled={isDeletingId === comment._id}
                              className="h-8"
                            >
                              Delete
                            </Button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {canLoadMore ? (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => setLimit((l) => Math.min(200, l + 20))}>
                Load more
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {reportTargetId ? (
        <ReportDialog
          open={reportOpen}
          onOpenChange={(nextOpen) => {
            setReportOpen(nextOpen);
            if (!nextOpen) {
              setReportTargetId(null);
            }
          }}
          targetType="comment"
          targetId={reportTargetId}
        />
      ) : null}
    </div>
  );
}
