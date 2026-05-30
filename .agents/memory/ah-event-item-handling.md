---
name: AH event item handling split
description: How ah_bought/ah_cancelled events handle equipment items vs materials differently across MultiplayerContext and index.tsx
---

Equipment AH events are handled at two layers with a deliberate split:

**MultiplayerContext** handles the inventory restoration:
- `ah_bought` with `isEquip`: calls `game.addItemToBag(listing.item)` immediately
- `ah_cancelled` with `isEquip`: calls `game.addItemToBag(listing.item)` to return it
- For materials: only pushes to `ahEvents`, does NOT call `addMaterials`

**index.tsx** processes `ahEvents`:
- `bought` + `isEquip`: shows toast only (item already in bag from context)
- `bought` + material: calls `addMaterials` + shows toast
- `cancelled` + `isEquip`: consumes event only (item already returned by context)
- `cancelled` + material: calls `addMaterials`

**Why:** MultiplayerContext runs on every WS message including background/offline delivery; index.tsx only runs when the component is mounted. Splitting ensures items always get returned even if the game screen is unmounted.

**How to apply:** Always guard `addMaterials` calls in `ahEvents` with `!isEquip` check.
