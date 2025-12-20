"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Textarea } from "@/app/components/ui/textarea";

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
      await createComment({ reviewId, text });
      setDraft("");
      onCountDelta?.(1);
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

  return (
    <div className={className}>
      {currentUser ? (
        <div className="mb-4">
          <div className="flex gap-3 mb-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
              <AvatarFallback className="bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)]">
                {currentUser.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="Add a comment..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)] placeholder:text-[var(--bkl-color-text-disabled)] rounded-[var(--bkl-radius-md)] min-h-[84px] resize-none"
                style={{ fontSize: "var(--bkl-font-size-sm)" }}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={!draft.trim() || isSubmitting}
              className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-hover)] text-[var(--bkl-color-bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post
            </Button>
          </div>
        </div>
      ) : null}

      {!comments ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-20 bg-[var(--bkl-color-bg-tertiary)]" />
          ))}
        </div>
      ) : count === 0 ? (
        <p
          className="text-[var(--bkl-color-text-disabled)] text-center py-6"
          style={{ fontSize: "var(--bkl-font-size-sm)" }}
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
                className="pb-4 border-b border-[var(--bkl-color-border)] last:border-b-0 last:pb-0"
              >
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={comment.author.avatarUrl} alt={comment.author.name} />
                    <AvatarFallback className="bg-[var(--bkl-color-bg-tertiary)] text-[var(--bkl-color-text-primary)]">
                      {comment.author.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p
                        className="text-[var(--bkl-color-text-primary)]"
                        style={{ fontSize: "var(--bkl-font-size-sm)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                      >
                        {comment.author.name}
                      </p>
                      <span className="text-[var(--bkl-color-text-disabled)]">•</span>
                      <p
                        className="text-[var(--bkl-color-text-disabled)]"
                        style={{ fontSize: "var(--bkl-font-size-xs)" }}
                      >
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </p>
                      {comment.isAuthor ? (
                        <span
                          className="ml-auto text-[var(--bkl-color-text-disabled)]"
                          style={{ fontSize: "var(--bkl-font-size-xs)" }}
                        >
                          You
                        </span>
                      ) : null}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)] placeholder:text-[var(--bkl-color-text-disabled)] rounded-[var(--bkl-radius-md)] min-h-[84px] resize-none"
                          style={{ fontSize: "var(--bkl-font-size-sm)" }}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={cancelEdit}>
                            Cancel
                          </Button>
                          <Button
                            onClick={saveEdit}
                            disabled={!editText.trim() || isSavingEdit}
                            className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-hover)] text-[var(--bkl-color-bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p
                          className="text-[var(--bkl-color-text-secondary)]"
                          style={{ fontSize: "var(--bkl-font-size-sm)", lineHeight: "var(--bkl-leading-relaxed)" }}
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
    </div>
  );
}
