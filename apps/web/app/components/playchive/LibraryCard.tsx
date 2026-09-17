"use client";

import { useState } from "react";
import Link from "next/link";
import { OpenCaseLink } from "./OpenCaseLink";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { ChevronDown, Trash2, Check } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { Cover } from "./Cover";
import { StatusChip, STATUS_LABEL, STATUS_ORDER, normalizeStatus, type LibraryStatus } from "./StatusChip";

export type LibraryItem = {
  _id: Id<"backlogItems">;
  status: string;
  platform?: string;
  updatedAt?: number;
  game: { _id: Id<"games">; title: string; coverUrl?: string; releaseYear?: number; aggregatedRating?: number } | null;
};

/** Menu that moves a library item between shelves or removes it. Owner-only; mutations validate ownership server-side. */
export function MoveMenu({ item, compact }: { item: LibraryItem; compact?: boolean }) {
  const update = useMutation(api.backlog.update);
  const remove = useMutation(api.backlog.remove);
  const [busy, setBusy] = useState(false);
  const current = normalizeStatus(item.status);

  const move = async (status: LibraryStatus) => {
    if (status === current || busy) return;
    setBusy(true);
    try {
      const now = Date.now();
      await update({ backlogId: item._id, status, ...(status === "playing" ? { startedAt: now } : {}), ...(status === "completed" ? { completedAt: now } : {}) });
      toast.success(`Moved to ${STATUS_LABEL[status]}`);
    } catch (error) {
      console.error("[LibraryCard] move failed", error);
      toast.error("Couldn’t move that game. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const drop = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await remove({ backlogId: item._id });
      toast.success(`Removed ${item.game?.title ?? "game"} from your library`);
    } catch (error) {
      console.error("[LibraryCard] remove failed", error);
      toast.error("Couldn’t remove that game. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="pk-lib-move" disabled={busy} aria-label={`Move ${item.game?.title ?? "game"}, currently ${STATUS_LABEL[current]}`}>
          {compact ? null : "Move"}<ChevronDown size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
        {STATUS_ORDER.map(status => (
          <DropdownMenuItem key={status} className="rounded-lg" onSelect={() => move(status)}>
            <StatusChip status={status} />{status === current && <Check size={14} className="ml-auto" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="rounded-lg text-red" onSelect={drop}><Trash2 size={14} />Remove from library</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Cover tile for the owner’s library with a status chip and quick move. */
export function LibraryCard({ item, canEdit = true }: { item: LibraryItem; canEdit?: boolean }) {
  if (!item.game) return null;
  return (
    <div className="pk-lib">
      <OpenCaseLink href={`/game/${item.game._id}`} gameId={item.game._id} coverUrl={item.game.coverUrl} title={item.game.title} className="pk-lib-cover" aria-label={item.game.title}>
        <StatusChip status={item.status} />
        <Cover src={item.game.coverUrl} title={item.game.title} sizes="(max-width: 639px) 45vw, 200px" gameId={item.game._id} />
      </OpenCaseLink>
      <p className="pk-lib-title">{item.game.title}</p>
      <div className="pk-lib-meta">
        <span>{item.game.releaseYear ?? ""}{item.platform ? ` · ${item.platform}` : ""}</span>
        {canEdit && <MoveMenu item={item} />}
      </div>
    </div>
  );
}

/** Row layout for list view. */
export function LibraryRow({ item, canEdit = true }: { item: LibraryItem; canEdit?: boolean }) {
  if (!item.game) return null;
  return (
    <div className="pk-lib-row">
      <OpenCaseLink href={`/game/${item.game._id}`} gameId={item.game._id} coverUrl={item.game.coverUrl} title={item.game.title} aria-label={item.game.title}><Cover src={item.game.coverUrl} title={item.game.title} sizes="56px" tilt={false} gameId={item.game._id} /></OpenCaseLink>
      <div className="min-w-0">
        <Link href={`/game/${item.game._id}`} className="pk-lib-title hover:text-gold">{item.game.title}</Link>
        <div className="pk-lib-meta mt-1 justify-start gap-3">
          <StatusChip status={item.status} />
          {item.game.releaseYear && <span>{item.game.releaseYear}</span>}
          {item.platform && <span>{item.platform}</span>}
          {item.game.aggregatedRating ? <span>{Math.round(item.game.aggregatedRating)}% IGDB</span> : null}
        </div>
      </div>
      {canEdit && <MoveMenu item={item} />}
    </div>
  );
}
