import React, { useState } from "react";
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import Colors from "@/constants/colors";
import { GameItem, Potion } from "@/context/GameContext";
import { SALVAGE_NPC_PRICES } from "@/lib/salvaging";
import {
  ITEM_QUALITY_COLORS, ITEM_RARITY_COLORS, formatItemName, formatPotionName,
} from "@/lib/items";
import { GatheringTool, TOOL_RARITY_COLORS, formatToolName } from "@/lib/tools";
import { CraftResult } from "@/lib/crafting";
import { ItemImage } from "./ItemImage";
import { PotionImage } from "./PotionImage";
import { ToolImage } from "./ToolImage";

const STAT_ROWS: { key: "strength" | "health" | "defence" | "speed"; label: string; icon: string }[] = [
  { key: "strength", label: "Strength", icon: "⚔" },
  { key: "health",   label: "Health",   icon: "❤" },
  { key: "defence",  label: "Defence",  icon: "🛡" },
  { key: "speed",    label: "Speed",    icon: "⚡" },
];

interface CraftRevealModalProps {
  visible: boolean;
  results: CraftResult[];
  onClose: () => void;
  onEquipItem?: (item: GameItem) => void;
  onSalvageItem?: (item: GameItem) => void;
  onSellItemToNpc?: (item: GameItem) => void;
  onSellOnAh?: (item: GameItem) => void;
  onUsePotion?: (potion: Potion) => void;
  onSellPotionOnAh?: (potion: Potion) => void;
}

export function CraftRevealModal({
  visible, results, onClose,
  onEquipItem, onSalvageItem, onSellItemToNpc, onSellOnAh,
  onUsePotion, onSellPotionOnAh,
}: CraftRevealModalProps) {
  const [index, setIndex] = useState(0);

  if (!visible || results.length === 0) return null;

  const safeIndex = Math.min(index, results.length - 1);
  const current = results[safeIndex];
  const isLast = safeIndex >= results.length - 1;

  const advance = () => {
    if (isLast) { setIndex(0); onClose(); }
    else setIndex(safeIndex + 1);
  };

  const doAction = (fn: () => void) => { fn(); advance(); };

  // ── Equipment card ──────────────────────────────────────────────────────────
  const renderEquipment = (item: GameItem) => {
    const rc = (ITEM_RARITY_COLORS as Record<string, string>)[item.rarity] ?? "#9CA3AF";
    const qc = (ITEM_QUALITY_COLORS as Record<string, string>)[item.quality] ?? "#9CA3AF";
    const npcPrice = (SALVAGE_NPC_PRICES as Record<string, number>)[item.rarity] ?? 1000;
    const hasStats = STAT_ROWS.some(({ key }) => (item.stats[key] ?? 0) > 0 || (item.percentStats[key] ?? 0) > 0);
    return (
      <View style={ss.resultCard}>
        <View style={ss.artRow}>
          <ItemImage slot={item.slot} rarity={item.rarity} quality={item.quality} tier={item.tier} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={[ss.itemName, { color: rc }]} numberOfLines={2}>{formatItemName(item)}</Text>
            {item.quality !== "Basic" && (
              <View style={[ss.qualBadge, { borderColor: qc + "99", backgroundColor: qc + "18" }]}>
                <Text style={[ss.qualBadgeTxt, { color: qc }]}>{item.quality.toUpperCase()}</Text>
              </View>
            )}
            <View style={ss.tagRow}>
              <View style={[ss.tag, { borderColor: rc }]}>
                <Text style={[ss.tagTxt, { color: rc }]}>{item.rarity.toUpperCase()}</Text>
              </View>
              <View style={[ss.tag, { borderColor: "#555" }]}>
                <Text style={[ss.tagTxt, { color: "#aaa" }]}>T{item.tier}</Text>
              </View>
              <View style={[ss.tag, { borderColor: "#555" }]}>
                <Text style={[ss.tagTxt, { color: "#aaa" }]}>{item.slot}</Text>
              </View>
            </View>
            <Text style={ss.npcHint}>🪙 NPC: {npcPrice.toLocaleString()}g</Text>
          </View>
        </View>
        {hasStats ? (
          <ScrollView style={ss.statsScroll} showsVerticalScrollIndicator={false}>
            {STAT_ROWS.map(({ key, label, icon }) => {
              const flat = item.stats[key] ?? 0;
              const pct  = item.percentStats[key] ?? 0;
              if (flat === 0 && pct === 0) return null;
              return (
                <View key={key} style={ss.statRow}>
                  <Text style={ss.statIcon}>{icon}</Text>
                  <Text style={ss.statLabel}>{label}</Text>
                  {flat > 0 && <Text style={ss.flatVal}>+{flat}</Text>}
                  {pct > 0 && <Text style={ss.pctVal}>+{(pct * 100).toFixed(1)}%</Text>}
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={ss.noStat}>No stat bonuses</Text>
        )}
      </View>
    );
  };

  // ── Potion card ─────────────────────────────────────────────────────────────
  const renderPotion = (potion: Potion) => {
    const rc = (ITEM_RARITY_COLORS as Record<string, string>)[potion.rarity] ?? "#9CA3AF";
    const durationMin = Math.floor(potion.durationSeconds / 60);
    return (
      <View style={ss.resultCard}>
        <View style={ss.artRow}>
          <PotionImage type={potion.type as any} rarity={potion.rarity as any} tier={potion.tier as any} size={72} />
          <View style={{ flex: 1, justifyContent: "center", gap: 8 }}>
            <Text style={[ss.itemName, { color: rc }]} numberOfLines={2}>{formatPotionName(potion)}</Text>
            <View style={ss.tagRow}>
              <View style={[ss.tag, { borderColor: rc }]}>
                <Text style={[ss.tagTxt, { color: rc }]}>{potion.rarity.toUpperCase()}</Text>
              </View>
              <View style={[ss.tag, { borderColor: "#555" }]}>
                <Text style={[ss.tagTxt, { color: "#aaa" }]}>T{potion.tier}</Text>
              </View>
            </View>
            <Text style={ss.potionEffect}>
              +{potion.effectPercent}% {potion.type} · {durationMin}m
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // ── Tool card ────────────────────────────────────────────────────────────────
  const renderTool = (tool: GatheringTool) => {
    const rc = (TOOL_RARITY_COLORS as Record<string, string>)[tool.rarity] ?? "#9CA3AF";
    return (
      <View style={ss.resultCard}>
        <View style={ss.artRow}>
          <ToolImage type={tool.type} rarity={tool.rarity} size={72} />
          <View style={{ flex: 1, justifyContent: "center", gap: 8 }}>
            <Text style={[ss.itemName, { color: rc }]} numberOfLines={2}>{formatToolName(tool)}</Text>
            <View style={ss.tagRow}>
              <View style={[ss.tag, { borderColor: rc }]}>
                <Text style={[ss.tagTxt, { color: rc }]}>{tool.rarity.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={ss.potionEffect}>
              {tool.effectMinBonus}–{tool.effectMaxBonus} nodes · {tool.effectChance}% +1 · {tool.passiveChance}% sweep
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const item   = current.kind === "equipment" ? current.item   : undefined;
  const potion = current.kind === "potion"    ? current.potion : undefined;
  const tool   = current.kind === "tool"      ? current.tool   : undefined;
  const rc = item
    ? (ITEM_RARITY_COLORS as Record<string, string>)[item.rarity] ?? "#9CA3AF"
    : potion
      ? (ITEM_RARITY_COLORS as Record<string, string>)[potion.rarity] ?? "#9CA3AF"
      : tool
        ? (TOOL_RARITY_COLORS as Record<string, string>)[tool.rarity] ?? "#9CA3AF"
        : "#9CA3AF";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ss.overlay}>
        <View style={ss.sheet}>

          {/* ── Header ── */}
          <View style={ss.header}>
            <Text style={ss.headerTitle}>✨ Craft Complete!</Text>
            <View style={ss.counter}>
              <Text style={ss.counterTxt}>{safeIndex + 1} / {results.length}</Text>
            </View>
          </View>

          {/* ── Progress dots ── */}
          {results.length > 1 && (
            <View style={ss.dotsRow}>
              {results.map((_, i) => (
                <View key={i} style={[ss.dot, i === safeIndex && ss.dotActive, i < safeIndex && ss.dotDone]} />
              ))}
            </View>
          )}

          <ScrollView
            style={ss.scroll}
            contentContainerStyle={ss.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Item reveal ── */}
            <Text style={[ss.kindLabel, { color: rc }]}>
              {current.kind === "equipment" ? "⚔ EQUIPMENT" : current.kind === "potion" ? "⚗ POTION" : "🔨 TOOL"}
            </Text>

            {item   && renderEquipment(item)}
            {potion && renderPotion(potion)}
            {tool   && renderTool(tool)}

            {/* ── Action buttons ── */}
            <View style={ss.actions}>
              {item && (
                <>
                  <View style={ss.actionRow}>
                    {onEquipItem && (
                      <Pressable
                        style={[ss.actionBtn, { borderColor: rc, backgroundColor: rc + "22", flex: 1 }]}
                        onPress={() => doAction(() => onEquipItem(item))}
                      >
                        <Text style={[ss.actionBtnTxt, { color: rc }]}>EQUIP</Text>
                      </Pressable>
                    )}
                    {onSellOnAh && item.tradable && (
                      <Pressable
                        style={[ss.actionBtn, { borderColor: Colors.game.gold, backgroundColor: Colors.game.gold + "22", flex: 1 }]}
                        onPress={() => doAction(() => onSellOnAh(item))}
                      >
                        <Text style={[ss.actionBtnTxt, { color: Colors.game.gold }]}>SELL ON AH</Text>
                      </Pressable>
                    )}
                  </View>
                  <View style={ss.actionRow}>
                    {onSalvageItem && (
                      <Pressable
                        style={[ss.actionBtn, { borderColor: Colors.game.blue, backgroundColor: Colors.game.blue + "22", flex: 1 }]}
                        onPress={() => doAction(() => onSalvageItem(item))}
                      >
                        <Text style={[ss.actionBtnTxt, { color: Colors.game.blue }]}>SALVAGE</Text>
                      </Pressable>
                    )}
                    {onSellItemToNpc && (
                      <Pressable
                        style={[ss.actionBtn, { borderColor: "#F59E0B", backgroundColor: "#F59E0B22", flex: 1 }]}
                        onPress={() => doAction(() => onSellItemToNpc(item))}
                      >
                        <Text style={[ss.actionBtnTxt, { color: "#F59E0B" }]}>SELL TO NPC</Text>
                      </Pressable>
                    )}
                  </View>
                </>
              )}
              {potion && (
                <View style={ss.actionRow}>
                  {onUsePotion && (
                    <Pressable
                      style={[ss.actionBtn, { borderColor: rc, backgroundColor: rc + "22", flex: 1 }]}
                      onPress={() => doAction(() => onUsePotion(potion))}
                    >
                      <Text style={[ss.actionBtnTxt, { color: rc }]}>USE NOW</Text>
                    </Pressable>
                  )}
                  {onSellPotionOnAh && potion.tradable && (
                    <Pressable
                      style={[ss.actionBtn, { borderColor: Colors.game.gold, backgroundColor: Colors.game.gold + "22", flex: 1 }]}
                      onPress={() => doAction(() => onSellPotionOnAh(potion))}
                    >
                      <Text style={[ss.actionBtnTxt, { color: Colors.game.gold }]}>SELL ON AH</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {/* ── Next / Done ── */}
          <Pressable style={[ss.nextBtn, { borderColor: rc, backgroundColor: rc + "22" }]} onPress={advance}>
            <Text style={[ss.nextBtnTxt, { color: rc }]}>
              {isLast ? "DONE ✓" : `NEXT  ${safeIndex + 2}/${results.length} ›`}
            </Text>
          </Pressable>

        </View>
      </View>
    </Modal>
  );
}

const ss = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#000000AA", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.game.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: Colors.game.border,
    maxHeight: "90%",
  },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.game.border,
  },
  headerTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.game.text },
  counter: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.game.border,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  counterTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.game.textDim },

  dotsRow: {
    flexDirection: "row", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.game.border,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.game.border,
  },
  dotActive: { backgroundColor: Colors.game.gold, width: 20, borderRadius: 4 },
  dotDone:   { backgroundColor: Colors.game.green },

  scroll: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 10, gap: 14 },

  kindLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5,
    textAlign: "center",
  },

  resultCard: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.game.border,
    padding: 14, gap: 10,
  },
  artRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  itemName: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 4, lineHeight: 20 },
  qualBadge: {
    alignSelf: "flex-start", borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2, marginBottom: 4,
  },
  qualBadgeTxt: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  tagRow: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  tagTxt: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  npcHint: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.game.gold, opacity: 0.8, marginTop: 4 },
  potionEffect: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.game.textDim },

  statsScroll: { maxHeight: 110 },
  statRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 3, paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 6, marginBottom: 3,
  },
  statIcon:  { fontSize: 12, width: 18, textAlign: "center" },
  statLabel: { flex: 1, fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.game.textDim },
  flatVal:   { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.game.green },
  pctVal:    { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.game.blueLight },
  noStat:    { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textMuted, textAlign: "center", paddingVertical: 6 },

  actions: { gap: 8 },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    borderRadius: 10, borderWidth: 1.5,
    paddingVertical: 11, alignItems: "center",
  },
  actionBtnTxt: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },

  nextBtn: {
    marginHorizontal: 18, marginBottom: 24, marginTop: 8,
    borderRadius: 14, borderWidth: 2,
    paddingVertical: 14, alignItems: "center",
  },
  nextBtnTxt: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
});
