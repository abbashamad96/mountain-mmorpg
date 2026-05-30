---
name: Equipment AH listing storage
description: How equipment items are stored in the AH database JSONB and distinguished from material listings
---

Equipment items on the Auction House are stored in the existing `auction_listings.material` JSONB column by embedding the full item object as `material._item`. The `material.type` field is set to `"Equipment"` to distinguish it from normal material types ("Ore", "Wood", etc.).

**Why:** Avoids any schema change to add a separate item column; the JSONB column can hold arbitrary nested data, so embedding `_item` is zero-cost.

**How to apply:**
- `dbSaveAhListing`: `materialToStore = listing.item ? { ...listing.material, _item: listing.item } : listing.material`
- `loadFromDb`: extract `mat._item`, pass as `item` on the `AuctionListing` object, strip `_item` from `cleanMat`
- In `ah_list` handler: if `msg.item` present → Equipment listing with `count=1`; else normal material listing
- Filter/display: check `listing.material.type === "Equipment"` to identify item listings
