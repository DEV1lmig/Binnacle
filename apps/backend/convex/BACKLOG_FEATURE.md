# Backlog Feature

## Overview

The backlog feature allows users to track games they want to play, are currently playing, have completed, or have dropped without requiring a full review. Each backlog item can include status, platform, notes, and priority.

## Backend Implementation

### Schema (`apps/backend/convex/schema.ts`)

Added `backlogItems` table with:
- `userId`: Reference to users table
- `gameId`: Reference to games table
- `status`: String enum (want_to_play, playing, completed, dropped, on_hold)
- `platform`: Optional platform string
- `notes`: Optional user notes
- `priority`: Optional priority (1-5)
- `startedAt`: Optional timestamp when user started playing
- `completedAt`: Optional timestamp when user completed
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

Indexes:
- `by_user_id`: Fast lookup of user's backlog
- `by_game_id`: Fast lookup of who has a game in backlog
- `by_user_and_game`: Unique constraint check and quick duplicate detection

### API (`apps/backend/convex/backlog.ts`)

**Mutations:**
- `add(gameId, status?, platform?, notes?, priority?, startedAt?, completedAt?)` - Add or update backlog item (upsert)
- `update(backlogId, status?, platform?, notes?, priority?, startedAt?, completedAt?)` - Update existing item
- `remove(backlogId)` - Remove backlog item by ID
- `removeByGameId(gameId)` - Remove backlog item by game ID (convenience for toggles)

**Queries:**
- `listForUser(userId?, status?, limit?)` - List backlog items with optional filtering
- `listGameIdsForCurrentUser()` - Get array of game IDs in current user's backlog
- `getForCurrentUserAndGame(gameId)` - Get backlog item for specific game
- `getStatsForUser(userId)` - Get backlog statistics (counts by status)

All mutations validate:
- User authentication via Clerk → Convex user lookup
- Ownership (user can only modify their own backlog items)
- Game existence

## Frontend Implementation

### Components

**BacklogToggle** (`apps/web/app/components/BacklogToggle.tsx`)
- Shows "Add to Backlog" or "In Backlog [Status]"
- Opens BacklogModal when adding
- Removes from backlog when clicking on existing item
- Displays current status with color coding

**BacklogModal** (`apps/web/app/components/BacklogModal.tsx`)
- Modal for adding/editing backlog items
- Status selection with emoji icons and color coding
- Optional platform, notes, and priority inputs
- Auto-sets startedAt/completedAt based on status
- Keyboard accessible (Escape to close)

**BacklogGrid** (`apps/web/app/components/BacklogGrid.tsx`)
- Displays user's backlog in responsive grid
- Stats overview showing counts by status
- Status filter tabs
- Shows game cover, title, status badge, platform, notes preview
- Remove button (only on own profile)

### Integration

**Game Detail Page** (`apps/web/app/app/game/[gameId]/page.tsx`)
- Added BacklogToggle button next to "Add Your Review" and FavoriteToggle
- Shows current backlog status inline

**Profile Page** (`apps/web/app/app/profile/[username]/page.tsx`)
- Added "Backlog" tab between Reviews and Favorites
- Shows BacklogGrid with user's backlog items
- Visible to all users (public profile)

## Status Types

| Status | Label | Icon | Color | Description |
|--------|-------|------|-------|-------------|
| `want_to_play` | Want to Play | 📚 | Blue | User plans to play |
| `playing` | Playing | 🎮 | Green | Currently playing |
| `completed` | Completed | ✅ | Purple | Finished the game |
| `on_hold` | On Hold | ⏸️ | Yellow | Paused temporarily |
| `dropped` | Dropped | ❌ | Red | Stopped playing, won't continue |

## Usage Flow

### Adding a Game to Backlog

1. User navigates to game detail page
2. Clicks "Add to Backlog" button
3. Modal opens with status selection (default: want_to_play)
4. User optionally adds platform, notes, priority
5. Clicks "Add to Backlog"
6. Modal closes, button updates to "In Backlog [Status]"

### Updating Status

1. User clicks on "In Backlog [Status]" button
2. Removes item from backlog (or could open modal to edit - currently removes)
3. Can re-add with different status

### Viewing Backlog

1. Navigate to user profile
2. Click "Backlog" tab
3. View stats and filter by status
4. Click on game cover to go to detail page

## Development Notes

### Running Codegen

After schema/function changes, regenerate Convex types:

```pwsh
cd apps/backend
npx convex dev
```

Or from project root:

```pwsh
pnpm --filter backend run codegen
```

### Testing

Manual test checklist:
- [ ] Add game to backlog (unauthenticated - should show alert)
- [ ] Add game to backlog (authenticated - should open modal)
- [ ] Submit backlog item with all fields
- [ ] Submit backlog item with minimal fields
- [ ] View backlog on profile
- [ ] Filter backlog by status
- [ ] Remove item from backlog
- [ ] Add same game twice (should update, not duplicate)
- [ ] View someone else's backlog (no remove button)
- [ ] Check that stats update correctly

### Future Enhancements

Potential improvements:
- Edit backlog item via modal (currently removes on click)
- Backlog item detail page with full history
- Export backlog to CSV/JSON
- Import backlog from other platforms
- Social features (see friends' backlogs, recommendations)
- Analytics (time to complete, backlog growth trends)
- Backlog reminders/notifications
- Integration with game completion tracking APIs

## Migration Notes

This is an additive feature - no migration required. Existing users start with empty backlogs.

## Performance Considerations

- Backlog queries are indexed by userId for fast retrieval
- Limit queries to reasonable batch sizes (default 50-100)
- Stats are computed on-demand but could be denormalized if needed
- Consider pagination for users with very large backlogs

## Security & Privacy

- All mutations validate user authentication
- Ownership checks prevent users from modifying others' backlog items
- Backlog items are public on profile pages (by design)
- If private backlogs are needed, add a `visibility` field to schema

## API Reference

See `apps/backend/convex/backlog.ts` for full type definitions and implementation details.
