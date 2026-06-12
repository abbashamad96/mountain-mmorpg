import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { OrnatePanel, FantasyButton } from "@/components/ui";
import { Potion, PotionType, POTION_ICONS, POTION_NAMES } from "@/lib/items";
import { PotionImage } from "./PotionImage";

// ─── Sort helpers ─────────────────────────────────────────────────────────────

const TYPE_ORDER: PotionType[] = ["Gold", "XP", "Exploration"];
const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Elite", "Legendary"];

const TYPE_COLORS: Record<PotionType, string> = {
  Gold:        "#C9A84C",
  XP:          "#A855F7",
  Exploration: "#22C55E",
};

type FantasyVariant = "gold" | "amethyst" | "emerald";
const TYPE_VARIANTS: Record<PotionType, FantasyVariant> = {
  Gold:        "gold",
  XP:          "amethyst",
  Exploration: "emerald",
};

// ─── Stacking ─────────────────────────────────────────────────────────────────

interface PotionStack {
  rep: Potion;
  count: number;
}

function buildStacks(potionBag: Potion[]): Record<PotionType, PotionStack[]> {
  const map = new Map<string, PotionStack>();
  for (const p of potionBag) {
    if (!("effectPercent" in p)) continue;
    const key = `${p.type}|${p.rarity}|${p.tier}`;
    if (!map.has(key)) map.set(key, { rep: p, count: 0 });
    map.get(key)!.count++;
  }
  const result: Record<PotionType, PotionStack[]> = { Gold: [], XP: [], Exploration: [] };
  for (const stack of map.values()) {
    result[stack.rep.type as PotionType]?.push(stack);
  }
  for (const type of TYPE_ORDER) {
    result[type].sort((a, b) => {
      const ri = RARITY_ORDER.indexOf(a.rep.rarity) - RARITY_ORDER.indexOf(b.rep.rarity);
      return ri !== 0 ? ri : a.rep.tier - b.rep.tier;
    });
  }
  return result;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuickPotionPickerProps {
  potionBag: Potion[];
  onUse: (potion: Potion) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickPotionPicker({ potionBag, onUse }: QuickPotionPickerProps) {
  const [open, setOpen] = useState(false);

  const validBag = useMemo(
    () => potionBag.filter((p) => "effectPercent" in p),
    [potionBag]
  );
  const stacks = useMemo(() => buildStacks(potionBag), [potionBag]);
  const total = validBag.length;

  const handleUse = (stack: PotionStack) => {
    onUse(stack.rep);
    // If this was the last of its kind, close if bag now empty
    if (total <= 1) setOpen(false);
  };

  if (total === 0 && !open) {
    return (
      <View style={ss.anchor} pointerEvents="none">
        <View style={[ss.triggerBtn, ss.triggerDisabled]}>
          <Text style={ss.triggerIcon}>🧪</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={ss.anchor} pointerEvents="box-none">

      {/* ── Picker panel (rendered above button) ── */}
      {open && (
        <OrnatePanel style={ss.panel} padding={8} corners={false}>
          <ScrollView
            style={ss.scroll}
            contentContainerStyle={ss.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {TYPE_ORDER.map((type) => {
              const group = stacks[type];
              if (group.length === 0) return null;
              const tc = TYPE_COLORS[type];
              return (
                <View key={type} style={ss.section}>
                  {/* Section header */}
                  <View style={[ss.sectionHeader, { borderLeftColor: tc }]}>
                    <Text style={ss.sectionIcon}>{POTION_ICONS[type]}</Text>
                    <Text style={[ss.sectionLabel, { color: tc }]}>{POTION_NAMES[type]}</Text>
                  </View>

                  {/* Stacks */}
                  {group.map((stack) => {
                    const p = stack.rep;
                    return (
                      <View
                        key={`${p.type}|${p.rarity}|${p.tier}`}
                        style={[ss.row, { borderColor: tc + "33" }]}
                      >
                        {/* Potion image with count badge */}
                        <View style={ss.imgWrap}>
                          <PotionImage type={p.type as any} rarity={p.rarity as any} tier={p.tier as any} size={36} compact />
                          {stack.count > 1 && (
                            <View style={ss.countBadge}>
                              <Text style={ss.countText}>×{stack.count}</Text>
                            </View>
                          )}
                        </View>

                        {/* Info */}
                        <View style={ss.rowInfo}>
                          <Text style={ss.rowRarity} numberOfLines={1}>{p.rarity}</Text>
                          <Text style={ss.rowDetail} numberOfLines={1}>
                            T{p.tier} · +{p.effectPercent}% · {Math.floor(p.durationSeconds / 60)}m
                          </Text>
                        </View>

                        {/* USE */}
                        <FantasyButton
                          label="USE"
                          variant={TYPE_VARIANTS[type]}
                          size="sm"
                          onPress={() => handleUse(stack)}
                        />
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
        </OrnatePanel>
      )}

      {/* ── Trigger button ── */}
      <Pressable
        style={[ss.triggerBtn, open && ss.triggerActive]}
        onPress={() => setOpen((v) => !v)}
      >
        <Text style={ss.triggerIcon}>🧪</Text>
      </Pressable>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PANEL_WIDTH = 240;

const ss = StyleSheet.create({
  // Anchor — absolutely positioned in parent
  anchor: {
    position: "absolute",
    bottom: 8,
    right: 0,
    alignItems: "flex-end",
    zIndex: 20,
  },

  // Floating trigger button
  triggerBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: Colors.game.surface,
    borderWidth: 1, borderColor: Colors.game.gold + "55",
    alignItems: "center", justifyContent: "center",
  },
  triggerActive: {
    borderColor: Colors.game.gold,
    backgroundColor: Colors.game.gold + "22",
  },
  triggerDisabled: {
    opacity: 0.35,
  },
  triggerIcon: { fontSize: 20, lineHeight: 24 },
  badge: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: Colors.game.purple,
    borderRadius: 8, minWidth: 16, height: 16, paddingHorizontal: 3,
    alignItems: "center", justifyContent: "center",
  },
  badgeText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#fff" },

  // Picker panel
  panel: {
    width: PANEL_WIDTH,
    maxHeight: 320,
    marginBottom: 8,
  },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: 8 },

  // Section
  section: { gap: 4 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingLeft: 6, borderLeftWidth: 2, marginBottom: 2,
  },
  sectionIcon: { fontSize: 13 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },

  // Stack row
  row: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 6, paddingHorizontal: 6,
    backgroundColor: Colors.game.surface,
    borderRadius: 10,
    borderWidth: 1,
  },
  imgWrap: { position: "relative" },
  countBadge: {
    position: "absolute", bottom: -3, right: -4,
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 6, paddingHorizontal: 3, paddingVertical: 1,
    borderWidth: 1, borderColor: Colors.game.gold + "55",
  },
  countText: { fontSize: 8, fontFamily: "Inter_700Bold", color: Colors.game.text },
  rowInfo: { flex: 1, gap: 1 },
  rowRarity: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.game.text },
  rowDetail: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
});
