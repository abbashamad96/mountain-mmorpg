---
name: Mountain-game ornate UI quirks
description: RN/Expo-web gotchas hit while building the gold "Forged in Gold" UI primitives, plus how to visually verify screens behind mandatory auth.
---

# Decorative PNG sizing on Expo web

- `aspectRatio` + `width:"100%"` on an `Image` is **unreliable** here — an AR-3.89 divider rendered ~4x too tall. Use **explicit height + `resizeMode="contain"`** (centers, no distortion), or measure container width with `onLayout` and set explicit `width`/`height`.
- For a framed banner (cartouche art with a dark center plate), don't stretch to a short full-width bar — it hides the frame. Measure width via `onLayout`, render at the art's natural AR sized as a fraction of width, then overlay text with `paddingHorizontal` ≈ the plate inset so the title lands on the plate.
- `Image` style must be typed `StyleProp<ImageStyle>`, not `ViewStyle` (ViewStyle's `overflow:"scroll"` isn't assignable to ImageStyle).

# Screenshot tool vs large images

- The screenshot tool can capture **before large PNGs finish streaming**; Metro logs `Cannot pipe to a closed or destroyed stream`. Large decorative art (>~1000px) may look missing on the first shot while small assets render. **Re-screenshot once warm** before concluding an asset is broken.

# Verifying screens behind mandatory auth

- AuthModal is gated `visible={showAuth || !isAuthenticated}`. To screenshot the main game screen, temporarily hard-set `visible={false}` then revert — the game renders a guest state behind it.
- The guest/default state has an **empty inventory**, so populated inventory cells can't be screenshotted. Verify slot/cell primitives (e.g. `RivetFrame`) standalone by dropping a temp instance with sample children into a visible surface, then remove it.

# RivetFrame (inventory slot)

- **Why:** swapping the rarity-colored slot border for a uniform gold frame image would erase rarity info. `RivetFrame` keeps the rarity color on the outer border and layers an inset gold ring + 4 corner rivets (all `pointerEvents="none"` so the parent Pressable still gets taps). `style` prop is merged last so callers can override borderWidth/color (used for equipment multi-select green state).
