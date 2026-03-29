import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { MaterialEntry, RARITY_COLORS, useGame } from "@/context/GameContext";
import { useMultiplayer } from "@/context/MultiplayerContext";
import { MaterialImage } from "./MaterialImage";
import { RarityText } from "./RarityText";

// ─── Config ───────────────────────────────────────────────────────────────────

interface StatsModalProps {
  visible: boolean;
  onClose: () => void;
  onListOnAh?: (entry: MaterialEntry) => void;
}

const STAT_CONFIG = [
  { key: "strength" as const, label: "Strength", icon: "⚔", color: Colors.game.red, desc: "Damage per hit · +0.5 per level", bonus: "+2 dmg" },
  { key: "health" as const, label: "Health", icon: "♥", color: Colors.game.green, desc: "Max HP · +1 per level", bonus: "+10 HP" },
  { key: "defence" as const, label: "Defence", icon: "🛡", color: Colors.game.blue, desc: "Block chance: def/(def+15000)×100%", bonus: "+1 def" },
  { key: "speed" as const, label: "Speed", icon: "⚡", color: Colors.game.gold, desc: "Action bar fill rate · faster = more turns", bonus: "+1 spd" },
];

const RARITY_DESC: Record<string, string> = {
  Common: "Widely found along the mountain road.",
  Uncommon: "Requires a keen eye to gather.",
  Rare: "Scarce and sought after by travelers.",
  Epic: "Powerful materials of unusual origin.",
  Elite: "Fierce rarity — few ever find these.",
  Legendary: "Storied materials of ancient power.",
  Superior: "Transcends ordinary classification.",
  Cosmic: "Touched by forces beyond understanding.",
};

const VERSION_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Standard", color: Colors.game.textMuted },
  1: { label: "Tier I", color: "#A78BFA" },
  2: { label: "Tier II", color: "#34D399" },
  3: { label: "Tier III", color: "#FCD34D" },
};

// ─── Item detail modal ────────────────────────────────────────────────────────

function ItemDetailModal({
  entry,
  onClose,
  onListOnAh,
}: {
  entry: MaterialEntry;
  onClose: () => void;
  onListOnAh?: (entry: MaterialEntry) => void;
}) {
  const { removeMaterial } = useGame();
  const { buyOrders, yourId, fillBuyOrder } = useMultiplayer();
  const rc = RARITY_COLORS[entry.material.rarity];
  const vInfo = VERSION_LABELS[entry.material.version] ?? VERSION_LABELS[0];

  const matchingOrders = buyOrders.filter(
    (o) =>
      o.material.type === entry.material.type &&
      o.material.rarity === entry.material.rarity &&
      (o.material.version === null || o.material.version === entry.material.version) &&
      o.buyerId !== yourId &&
      o.count - o.filled > 0
  );
  const bestOrder = [...matchingOrders].sort((a, b) => b.pricePerUnit - a.pricePerUnit)[0] ?? null;
  const fillCount = bestOrder ? Math.min(entry.count, bestOrder.count - bestOrder.filled) : 0;
  const quickSellGold = bestOrder ? fillCount * bestOrder.pricePerUnit : 0;

  const handleQuickSell = () => {
    if (!bestOrder || fillCount <= 0) return;
    removeMaterial(entry.key, fillCount);
    fillBuyOrder(bestOrder.id, fillCount, entry.material.version);
    onClose();
  };

  return (
    <Modal transparent visible animationType="fade">
      <Pressable style={styles.detailOverlay} onPress={onClose}>
        <Pressable style={[styles.detailCard, { borderColor: rc }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.detailImgWrap}>
            <MaterialImage
              type={entry.material.type}
              rarity={entry.material.rarity}
              version={entry.material.version}
              size={96}
              compact={false}
              animateParticles={false}
            />
          </View>
          <View style={styles.detailInfo}>
            <RarityText
              rarity={entry.material.rarity}
              version={entry.material.version}
              label={`${entry.material.rarity} ${entry.material.type}`}
              style={styles.detailName}
            />
            <View style={styles.detailTagRow}>
              <View style={[styles.detailTag, { borderColor: rc }]}>
                <Text style={[styles.detailTagTxt, { color: rc }]}>{entry.material.type.toUpperCase()}</Text>
              </View>
              <View style={[styles.detailTag, { borderColor: vInfo.color }]}>
                <Text style={[styles.detailTagTxt, { color: vInfo.color }]}>{vInfo.label.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.detailDesc}>{RARITY_DESC[entry.material.rarity] ?? ""}</Text>
            <View style={styles.detailCountRow}>
              <Text style={styles.detailCountLabel}>IN INVENTORY</Text>
              <Text style={[styles.detailCount, { color: rc }]}>×{entry.count}</Text>
            </View>
          </View>

          {/* Quick Sell if buy orders exist */}
          {bestOrder && (
            <Pressable style={styles.quickSellBtn} onPress={handleQuickSell}>
              <Text style={styles.quickSellTxt}>
                ⚡ QUICK SELL ×{fillCount}  ·  {quickSellGold.toLocaleString()}G
              </Text>
              <Text style={styles.quickSellSub}>Best buy order — {bestOrder.pricePerUnit}G each · by {bestOrder.buyerName}</Text>
            </Pressable>
          )}

          {/* List on AH */}
          {onListOnAh && (
            <Pressable style={styles.listAhBtn} onPress={() => onListOnAh(entry)}>
              <Text style={styles.listAhTxt}>LIST ON AUCTION HOUSE</Text>
            </Pressable>
          )}

          <Pressable style={styles.detailClose} onPress={onClose}>
            <Text style={styles.detailCloseTxt}>CLOSE</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function StatsModal({ visible, onClose, onListOnAh }: StatsModalProps) {
  const { gameState, allocateStat } = useGame();
  const char = gameState.character;
  const hasPending = char.pendingStatPoints > 0;
  const xpPct = Math.min(100, (char.xp / char.xpToNext) * 100);
  const [selectedEntry, setSelectedEntry] = useState<MaterialEntry | null>(null);

  const handleListOnAhFromDetail = (entry: MaterialEntry) => {
    setSelectedEntry(null);
    onListOnAh?.(entry);
  };

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.nameLabel}>WANDERER</Text>
              <View style={styles.levelRow}>
                <Text style={styles.lvLabel}>Level </Text>
                <Text style={styles.lvValue}>{char.level}</Text>
              </View>
            </View>
            <View style={styles.goldBlock}>
              <View style={styles.goldCoin}>
                <Text style={styles.goldCoinText}>G</Text>
              </View>
              <Text style={styles.goldVal}>{char.gold.toLocaleString()}</Text>
            </View>
          </View>

          {/* XP Bar */}
          <View style={styles.xpRow}>
            <View style={styles.xpGem}>
              <Text style={styles.xpGemText}>✦</Text>
            </View>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${xpPct}%` as any }]} />
            </View>
            <Text style={styles.xpNums}>{char.xp}/{char.xpToNext}</Text>
          </View>

          {hasPending && (
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingText}>
                ✦ {char.pendingStatPoints} stat point{char.pendingStatPoints > 1 ? "s" : ""} to allocate
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Stats */}
            <View style={styles.statGrid}>
              {STAT_CONFIG.map((s) => {
                const val = char.stats[s.key];
                // Derived display values
                let derivedLabel: string | null = null;
                if (s.key === "defence") {
                  const blockPct = (val / (val + 15000)) * 100;
                  derivedLabel = `${blockPct.toFixed(2)}% block chance`;
                } else if (s.key === "speed") {
                  const cost = Math.round(15000 / (100 + 0.1 * Math.max(0, val)));
                  const sec  = (cost * 10 / 1000).toFixed(2);
                  derivedLabel = `${cost} tks / turn  ·  ${sec}s`;
                } else if (s.key === "strength") {
                  derivedLabel = `${Math.round(val * 0.9)}–${Math.round(val * 1.1)} dmg`;
                } else if (s.key === "health") {
                  derivedLabel = `${Math.floor(val)} max HP`;
                }
                return (
                  <View key={s.key} style={styles.statCard}>
                    <View style={styles.statCardTop}>
                      <Text style={styles.statIcon}>{s.icon}</Text>
                      <View style={styles.statInfo}>
                        <Text style={[styles.statName, { color: s.color }]}>{s.label}</Text>
                        <Text style={styles.statDesc}>{s.desc}</Text>
                        {derivedLabel && (
                          <Text style={[styles.statDerived, { color: s.color }]}>{derivedLabel}</Text>
                        )}
                      </View>
                      <Text style={[styles.statVal, { color: s.color }]}>
                        {s.key === "strength" ? val.toFixed(2) : Math.floor(val)}
                      </Text>
                    </View>
                    {hasPending && (
                      <Pressable
                        style={[styles.allocBtn, { borderColor: s.color }]}
                        onPress={() => allocateStat(s.key)}
                      >
                        <Text style={[styles.allocBtnText, { color: s.color }]}>
                          + Allocate ({s.bonus})
                        </Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Inventory */}
            {char.materials.length > 0 && (
              <View style={styles.materialsBlock}>
                <Text style={styles.sectionLabel}>INVENTORY  ·  tap to inspect</Text>
                <View style={styles.inventoryGrid}>
                  {char.materials.map((entry) => {
                    const rarityColor = RARITY_COLORS[entry.material.rarity];
                    return (
                      <Pressable
                        key={entry.key}
                        style={styles.invSlotWrap}
                        onPress={() => setSelectedEntry(entry)}
                      >
                        <View style={[styles.invSlot, { borderColor: rarityColor }]}>
                          <MaterialImage
                            type={entry.material.type}
                            rarity={entry.material.rarity}
                            version={entry.material.version}
                            size={68}
                            compact
                            animateParticles={false}
                          />
                        </View>
                        <View style={[styles.countBadge, { backgroundColor: rarityColor }]}>
                          <Text style={styles.countText} numberOfLines={1}>×{entry.count}</Text>
                        </View>
                        <View style={styles.typeLabel}>
                          <Text style={styles.typeLabelText} adjustsFontSizeToFit minimumFontScale={0.7}>
                            {entry.material.type.toUpperCase()}
                            {entry.material.version > 0 ? ` T${entry.material.version}` : ""}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>CLOSE</Text>
          </Pressable>
        </View>
      </View>

      {selectedEntry && (
        <ItemDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onListOnAh={onListOnAh ? handleListOnAhFromDetail : undefined}
        />
      )}
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.game.surfaceAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.game.border,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: Colors.game.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  nameLabel: {
    fontSize: 10, fontFamily: "Inter_600SemiBold",
    color: Colors.game.textMuted, letterSpacing: 2,
  },
  levelRow: { flexDirection: "row", alignItems: "baseline" },
  lvLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
  lvValue: { fontSize: 34, fontFamily: "Inter_700Bold", color: Colors.game.gold, lineHeight: 38 },
  goldBlock: { flexDirection: "row", alignItems: "center", gap: 7 },
  goldCoin: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.game.gold,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#a07820",
  },
  goldCoinText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#3d2e00" },
  goldVal: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  xpRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  xpGem: {
    width: 18, height: 18, borderRadius: 4,
    backgroundColor: Colors.game.purple,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#6b21a8",
  },
  xpGemText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#e9d5ff" },
  xpTrack: {
    flex: 1, height: 5,
    backgroundColor: Colors.game.border, borderRadius: 3, overflow: "hidden",
  },
  xpFill: { height: "100%", backgroundColor: Colors.game.purple, borderRadius: 3 },
  xpNums: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.game.textMuted },
  pendingBanner: {
    backgroundColor: "rgba(128,96,192,0.15)",
    borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: Colors.game.purple,
    alignItems: "center", marginBottom: 6,
  },
  pendingText: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.game.purpleLight },
  divider: { height: 1, backgroundColor: Colors.game.border, marginVertical: 8 },
  scroll: { flex: 0, maxHeight: 480 },
  statGrid: { gap: 10, marginBottom: 16 },
  statCard: {
    backgroundColor: Colors.game.surface,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.game.border, gap: 8,
  },
  statCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  statIcon: { fontSize: 20 },
  statInfo: { flex: 1 },
  statName: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statDesc: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },
  statDerived: { fontSize: 10, fontFamily: "Inter_500Medium", opacity: 0.75, marginTop: 2 },
  statVal: { fontSize: 26, fontFamily: "Inter_700Bold" },
  allocBtn: {
    borderWidth: 1, borderRadius: 8,
    paddingVertical: 7, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  allocBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  materialsBlock: { gap: 10, marginBottom: 8 },
  sectionLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 2,
  },
  inventoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  invSlotWrap: { alignItems: "center", gap: 4 },
  invSlot: {
    width: 72, height: 72, borderRadius: 12,
    borderWidth: 2, overflow: "visible",
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.game.surface,
  },
  countBadge: {
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
    minWidth: 24, alignItems: "center",
  },
  countText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#000" },
  typeLabel: { alignItems: "center", width: 72 },
  typeLabelText: {
    fontSize: 9, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 0.5, textAlign: "center",
  },
  closeBtn: {
    backgroundColor: Colors.game.surface,
    borderRadius: 14, paddingVertical: 14,
    alignItems: "center", marginTop: 10,
    borderWidth: 1, borderColor: Colors.game.border,
  },
  closeBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 2 },
  // Item detail
  detailOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center",
    padding: 24,
  },
  detailCard: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 20, padding: 20,
    width: "100%", maxWidth: 340,
    borderWidth: 2, gap: 10,
  },
  detailImgWrap: { alignItems: "center", marginBottom: 4 },
  detailInfo: { gap: 8 },
  detailName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  detailTagRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  detailTag: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  detailTagTxt: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  detailDesc: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.game.textDim, lineHeight: 18,
  },
  detailCountRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.game.border,
  },
  detailCountLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 2,
  },
  detailCount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  quickSellBtn: {
    backgroundColor: "rgba(34,197,94,0.10)", borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, gap: 3,
    borderWidth: 1, borderColor: Colors.game.green,
    alignItems: "center",
  },
  quickSellTxt: {
    fontSize: 12, fontFamily: "Inter_700Bold",
    color: Colors.game.green, letterSpacing: 1,
  },
  quickSellSub: {
    fontSize: 10, fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted,
  },
  listAhBtn: {
    backgroundColor: "rgba(201,168,76,0.10)", borderRadius: 12,
    paddingVertical: 11, alignItems: "center",
    borderWidth: 1, borderColor: Colors.game.gold,
  },
  listAhTxt: {
    fontSize: 11, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 1.5,
  },
  detailClose: {
    backgroundColor: Colors.game.surface, borderRadius: 12,
    paddingVertical: 12, alignItems: "center",
    borderWidth: 1, borderColor: Colors.game.border,
  },
  detailCloseTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 2 },
});
