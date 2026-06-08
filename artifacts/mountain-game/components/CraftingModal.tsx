import React, { useMemo, useState } from "react";
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ITEM_RARITIES, ITEM_RARITY_COLORS, formatItemName, formatPotionName } from "@/lib/items";
import { TOOL_NAMES } from "@/lib/tools";
import {
  CraftResult, CRAFTING_MATERIALS_NEEDED, CRAFTING_UNLOCK_LEVELS,
  CRAFTING_XP_REWARDS, getXpToNextCraftingLevel, CRAFTING_MAX_LEVEL,
  getCraftingQualityWeights,
} from "@/lib/crafting";
import { useGame } from "@/context/GameContext";
import { RarityName, VersionNum, RARITY_COLORS } from "@/context/GameContext";
import { ItemImage } from "./ItemImage";
import { PotionImage } from "./PotionImage";
import { ToolImage } from "./ToolImage";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIERS: VersionNum[] = [0, 1, 2, 3];

const MATERIAL_ICONS: Record<string, string> = {
  Wood: "🪵",
  Herb: "🌿",
  Ore: "⛏",
  Leather: "🧶",
};

const RARITY_ABBR: Record<RarityName, string> = {
  Common: "C", Uncommon: "U", Rare: "R", Epic: "E",
  Elite: "EL", Legendary: "L", Superior: "S", Cosmic: "CS",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function XpBar({ current, total, level }: { current: number; total: number; level: number }) {
  const pct = total > 0 ? Math.min(1, current / total) : 1;
  return (
    <View style={xpStyles.wrap}>
      <View style={xpStyles.track}>
        <View style={[xpStyles.fill, { width: `${pct * 100}%` as any }]} />
      </View>
      <Text style={xpStyles.label}>
        {level >= CRAFTING_MAX_LEVEL
          ? "MAX LEVEL"
          : `${current.toLocaleString()} / ${total.toLocaleString()} XP`}
      </Text>
    </View>
  );
}

const xpStyles = StyleSheet.create({
  wrap: { gap: 3 },
  track: {
    height: 6, backgroundColor: Colors.game.border,
    borderRadius: 3, overflow: "hidden",
  },
  fill: {
    height: "100%", backgroundColor: Colors.game.blue,
    borderRadius: 3,
  },
  label: {
    fontSize: 10, fontFamily: "Inter_400Regular",
    color: Colors.game.textDim, textAlign: "right",
  },
});

function QualityPreview({ level }: { level: number }) {
  const [basic, good, excellent] = getCraftingQualityWeights(level);
  return (
    <View style={qStyles.row}>
      <Text style={[qStyles.pill, { color: Colors.game.textMuted }]}>
        Basic {basic.toFixed(1)}%
      </Text>
      <Text style={[qStyles.pill, { color: Colors.game.blue }]}>
        Good {good.toFixed(1)}%
      </Text>
      <Text style={[qStyles.pill, { color: Colors.game.gold }]}>
        Excellent {excellent.toFixed(1)}%
      </Text>
    </View>
  );
}

const qStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: { fontSize: 10, fontFamily: "Inter_500Medium" },
});

function ResultCard({ result }: { result: CraftResult }) {
  const rarity =
    result.item?.rarity ?? result.potion?.rarity ?? result.tool?.rarity ?? "Common";
  const rc = ITEM_RARITY_COLORS[rarity as keyof typeof ITEM_RARITY_COLORS];

  let label = "";
  let sub = "";
  if (result.kind === "equipment" && result.item) {
    label = formatItemName(result.item);
    sub = `${result.item.quality} quality · ${result.item.slot}`;
  } else if (result.kind === "potion" && result.potion) {
    label = formatPotionName(result.potion);
    sub = `+${result.potion.effectPercent}% · ${Math.floor(result.potion.durationSeconds / 60)}m`;
  } else if (result.kind === "tool" && result.tool) {
    label = `${rarity} ${TOOL_NAMES[result.tool.type]}`;
    sub = `${result.tool.effectMinBonus}–${result.tool.effectMaxBonus} nodes`;
  }

  return (
    <View style={[rcStyles.card, { borderColor: rc + "55" }]}>
      <View style={rcStyles.imageWrap}>
        {result.kind === "equipment" && result.item && (
          <ItemImage
            slot={result.item.slot}
            rarity={result.item.rarity}
            tier={result.item.tier}
            quality={result.item.quality}
            size={52}
          />
        )}
        {result.kind === "potion" && result.potion && (
          <PotionImage
            type={result.potion.type as any}
            rarity={result.potion.rarity as any}
            tier={result.potion.tier as any}
            size={52}
          />
        )}
        {result.kind === "tool" && result.tool && (
          <ToolImage type={result.tool.type} rarity={result.tool.rarity} size={52} />
        )}
      </View>
      <View style={rcStyles.info}>
        <Text style={[rcStyles.label, { color: rc }]} numberOfLines={2}>{label}</Text>
        <Text style={rcStyles.sub}>{sub}</Text>
        <Text style={rcStyles.kindBadge}>
          {result.kind === "equipment" ? "⚔ Equipment" : result.kind === "potion" ? "🧪 Potion" : "⛏ Tool"}
          {" "}added to bag
        </Text>
      </View>
    </View>
  );
}

const rcStyles = StyleSheet.create({
  card: {
    flexDirection: "row", gap: 12, alignItems: "center",
    backgroundColor: Colors.game.bg,
    borderRadius: 10, borderWidth: 1,
    padding: 12, marginTop: 12,
  },
  imageWrap: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 2 },
  label: { fontSize: 13, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
  kindBadge: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.game.textMuted, marginTop: 2 },
});

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function CraftingModal({ visible, onClose }: Props) {
  const { gameState, craftItem } = useGame();
  const char = gameState.character;
  const skill = char.craftingSkill;

  const [selectedRarity, setSelectedRarity] = useState<RarityName>("Common");
  const [selectedTier, setSelectedTier] = useState<VersionNum>(0);
  const [lastResult, setLastResult] = useState<CraftResult | null>(null);
  const [crafting, setCrafting] = useState(false);

  const xpToNext = getXpToNextCraftingLevel(skill.level);
  const isMaxLevel = skill.level >= CRAFTING_MAX_LEVEL;

  // Material breakdown for selected rarity + tier
  const matCounts = useMemo(() => {
    const c: Record<string, number> = { Wood: 0, Herb: 0, Ore: 0, Leather: 0 };
    for (const entry of char.materials) {
      if (entry.material.rarity === selectedRarity && entry.material.version === selectedTier) {
        c[entry.material.type] = (c[entry.material.type] ?? 0) + entry.count;
      }
    }
    return c;
  }, [char.materials, selectedRarity, selectedTier]);

  const totalAvailable = Object.values(matCounts).reduce((s, n) => s + n, 0);
  const needed = CRAFTING_MATERIALS_NEEDED[selectedRarity];
  const unlockLevel = CRAFTING_UNLOCK_LEVELS[selectedRarity];
  const isRarityUnlocked = skill.level >= unlockLevel;
  const canCraft = isRarityUnlocked && totalAvailable >= needed;

  const handleCraft = () => {
    if (!canCraft || crafting) return;
    setCrafting(true);
    setLastResult(null);
    // Small timeout for perceived crafting action
    setTimeout(() => {
      const result = craftItem(selectedRarity, selectedTier);
      setLastResult(result);
      setCrafting(false);
    }, 300);
  };

  const rc = RARITY_COLORS[selectedRarity];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>

          {/* ── Header ── */}
          <View style={s.header}>
            <Text style={s.title}>⚗ Crafting</Text>
            <View style={s.levelBadge}>
              <Text style={s.levelText}>Lv {skill.level}</Text>
            </View>
            <Pressable onPress={onClose} style={s.closeBtn} hitSlop={10}>
              <Feather name="x" size={20} color={Colors.game.textDim} />
            </Pressable>
          </View>

          {/* ── XP bar ── */}
          <View style={s.xpSection}>
            <XpBar current={skill.xp} total={xpToNext} level={skill.level} />
            <QualityPreview level={skill.level} />
          </View>

          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

            {/* ── Rarity selector ── */}
            <Text style={s.sectionLabel}>RARITY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rarityRow}>
              {(ITEM_RARITIES as RarityName[]).map((r) => {
                const unlocked = skill.level >= CRAFTING_UNLOCK_LEVELS[r];
                const color = RARITY_COLORS[r];
                const active = selectedRarity === r;
                return (
                  <Pressable
                    key={r}
                    style={[
                      s.rarityBtn,
                      active && { borderColor: color, backgroundColor: color + "22" },
                      !active && { borderColor: Colors.game.border },
                      !unlocked && s.rarityBtnLocked,
                    ]}
                    onPress={() => { setSelectedRarity(r); setLastResult(null); }}
                  >
                    <Text style={[s.rarityBtnLabel, { color: unlocked ? color : Colors.game.textMuted }]}>
                      {RARITY_ABBR[r]}
                    </Text>
                    {!unlocked && (
                      <Text style={s.lockText}>L{CRAFTING_UNLOCK_LEVELS[r]}</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* ── Tier selector ── */}
            <Text style={[s.sectionLabel, { marginTop: 10 }]}>TIER</Text>
            <View style={s.tierRow}>
              {TIERS.map((t) => (
                <Pressable
                  key={t}
                  style={[
                    s.tierBtn,
                    selectedTier === t && { borderColor: rc, backgroundColor: rc + "22" },
                    selectedTier !== t && { borderColor: Colors.game.border },
                  ]}
                  onPress={() => { setSelectedTier(t); setLastResult(null); }}
                >
                  <Text style={[s.tierBtnText, { color: selectedTier === t ? rc : Colors.game.textDim }]}>
                    T{t}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ── Materials panel ── */}
            <View style={[s.matPanel, { borderColor: rc + "33" }]}>
              <View style={s.matHeader}>
                <Text style={[s.matTitle, { color: rc }]}>
                  {selectedRarity} T{selectedTier} · {needed} materials needed
                </Text>
                <Text style={s.matAvail}>{totalAvailable} available</Text>
              </View>

              {/* Per-type breakdown */}
              <View style={s.matRows}>
                {Object.entries(matCounts).map(([type, count]) => (
                  <View key={type} style={s.matRow}>
                    <Text style={s.matIcon}>{MATERIAL_ICONS[type] ?? "📦"}</Text>
                    <Text style={s.matType}>{type}</Text>
                    <Text style={[s.matCount, count > 0 ? { color: Colors.game.text } : { color: Colors.game.textMuted }]}>
                      {count}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Progress bar */}
              <View style={s.matProgressTrack}>
                <View style={[
                  s.matProgressFill,
                  {
                    width: `${Math.min(100, (totalAvailable / needed) * 100)}%` as any,
                    backgroundColor: canCraft ? Colors.game.green : Colors.game.gold,
                  },
                ]} />
              </View>
            </View>

            {/* ── Lock notice or craft button ── */}
            {!isRarityUnlocked ? (
              <View style={s.lockedNotice}>
                <Feather name="lock" size={16} color={Colors.game.textMuted} />
                <Text style={s.lockedText}>
                  Reach crafting level {unlockLevel} to unlock {selectedRarity} crafting
                </Text>
              </View>
            ) : (
              <Pressable
                style={[
                  s.craftBtn,
                  canCraft && !crafting
                    ? { borderColor: rc, backgroundColor: rc + "22" }
                    : { borderColor: Colors.game.border, opacity: 0.5 },
                ]}
                onPress={handleCraft}
                disabled={!canCraft || crafting}
              >
                <Text style={[s.craftBtnText, { color: canCraft ? rc : Colors.game.textMuted }]}>
                  {crafting ? "Crafting…" : canCraft ? "⚗  CRAFT" : `Need ${needed - totalAvailable} more ${selectedRarity} T${selectedTier} materials`}
                </Text>
                {canCraft && !crafting && (
                  <Text style={s.craftXpHint}>+{CRAFTING_XP_REWARDS[selectedRarity]} crafting XP</Text>
                )}
              </Pressable>
            )}

            {/* ── Result card ── */}
            {lastResult && <ResultCard result={lastResult} />}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "#000000AA",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.game.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: Colors.game.border,
    maxHeight: "90%",
  },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.game.border,
  },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.game.text, flex: 1 },
  levelBadge: {
    backgroundColor: Colors.game.blue + "22",
    borderRadius: 8, borderWidth: 1, borderColor: Colors.game.blue + "55",
    paddingHorizontal: 8, paddingVertical: 3,
  },
  levelText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.game.blue },
  closeBtn: { padding: 2 },

  // XP
  xpSection: {
    paddingHorizontal: 18, paddingVertical: 10, gap: 6,
    borderBottomWidth: 1, borderBottomColor: Colors.game.border,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 1,
    marginBottom: 6,
  },

  // Rarity
  rarityRow: { flexDirection: "row", gap: 6, paddingBottom: 4 },
  rarityBtn: {
    minWidth: 44, paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1,
    alignItems: "center", gap: 2,
  },
  rarityBtnLocked: { opacity: 0.5 },
  rarityBtnLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
  lockText: { fontSize: 9, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },

  // Tier
  tierRow: { flexDirection: "row", gap: 6 },
  tierBtn: {
    flex: 1, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1,
    alignItems: "center",
  },
  tierBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },

  // Materials panel
  matPanel: {
    marginTop: 14, borderRadius: 10, borderWidth: 1,
    backgroundColor: Colors.game.bg, padding: 12, gap: 10,
  },
  matHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  matTitle: { fontSize: 12, fontFamily: "Inter_700Bold" },
  matAvail: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.game.textDim },
  matRows: { gap: 5 },
  matRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  matIcon: { fontSize: 15, width: 22, textAlign: "center" },
  matType: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
  matCount: { fontSize: 13, fontFamily: "Inter_700Bold" },
  matProgressTrack: {
    height: 4, backgroundColor: Colors.game.border,
    borderRadius: 2, overflow: "hidden",
  },
  matProgressFill: { height: "100%", borderRadius: 2 },

  // Locked notice
  lockedNotice: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 16, padding: 12,
    backgroundColor: Colors.game.bg,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.game.border,
  },
  lockedText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },

  // Craft button
  craftBtn: {
    marginTop: 14, padding: 16,
    borderRadius: 12, borderWidth: 1,
    alignItems: "center", gap: 4,
  },
  craftBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  craftXpHint: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },
});
