import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { RARITY_COLORS, RARITIES, useGame } from "@/context/GameContext";
import { MaterialImage } from "./MaterialImage";

// ── Rate data (mirrors GameContext roll logic exactly) ─────────────────────────

const RARITY_WEIGHTS = [60, 25, 10, 5.9, 2.9, 0.98, 0.2, 0.02];
const RARITY_TOTAL   = RARITY_WEIGHTS.reduce((a, b) => a + b, 0); // 105

const EVENT_RATES = [
  { label: "Gold & XP",  pct: (65 / 105) * 100, color: Colors.game.gold,   icon: "⚡" },
  { label: "Gathering",  pct: (25 / 105) * 100, color: Colors.game.green,  icon: "🌿" },
  { label: "Battle",     pct: (15 / 105) * 100, color: Colors.game.red,    icon: "⚔" },
];

const RARITY_RATES = RARITIES.map((r, i) => ({
  rarity: r,
  pct: (RARITY_WEIGHTS[i] / RARITY_TOTAL) * 100,
  color: RARITY_COLORS[r],
}));

const VERSION_RATES = [
  { label: "No Version", pct: 84, color: Colors.game.textMuted },
  { label: "V1",         pct: 10, color: "#A78BFA" },
  { label: "V2",         pct: 5,  color: "#34D399" },
  { label: "V3",         pct: 1,  color: "#FCD34D" },
];

interface StatsModalProps {
  visible: boolean;
  onClose: () => void;
}

const STAT_CONFIG = [
  { key: "strength" as const, label: "Strength", icon: "⚔", color: Colors.game.red, desc: "Attack power", bonus: "+1" },
  { key: "health" as const, label: "Health", icon: "♥", color: Colors.game.green, desc: "Max HP", bonus: "+5 HP" },
  { key: "defence" as const, label: "Defence", icon: "🛡", color: Colors.game.blue, desc: "Damage reduction", bonus: "+1" },
  { key: "speed" as const, label: "Speed", icon: "⚡", color: Colors.game.gold, desc: "Turn order", bonus: "+1" },
];

export function StatsModal({ visible, onClose }: StatsModalProps) {
  const { gameState, allocateStat } = useGame();
  const char = gameState.character;
  const hasPending = char.pendingStatPoints > 0;
  const xpPct = Math.min(100, (char.xp / char.xpToNext) * 100);

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
                return (
                  <View key={s.key} style={styles.statCard}>
                    <View style={styles.statCardTop}>
                      <Text style={styles.statIcon}>{s.icon}</Text>
                      <View style={styles.statInfo}>
                        <Text style={[styles.statName, { color: s.color }]}>{s.label}</Text>
                        <Text style={styles.statDesc}>{s.desc}</Text>
                      </View>
                      <Text style={[styles.statVal, { color: s.color }]}>{val}</Text>
                    </View>
                    <View style={styles.statBarTrack}>
                      <View
                        style={[
                          styles.statBarFill,
                          {
                            width: `${Math.min(100, (val / 50) * 100)}%` as any,
                            backgroundColor: s.color,
                          },
                        ]}
                      />
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

            {/* Inventory — material art squares */}
            {char.materials.length > 0 && (
              <View style={styles.materialsBlock}>
                <Text style={styles.sectionLabel}>INVENTORY</Text>
                <View style={styles.inventoryGrid}>
                  {char.materials.map((entry) => {
                    const rarityColor = RARITY_COLORS[entry.material.rarity];
                    return (
                      <View key={entry.key} style={styles.invSlotWrap}>
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
                        {/* Count badge — below slot, right-aligned */}
                        <View style={[styles.countBadge, { backgroundColor: rarityColor }]}>
                          <Text style={styles.countText} numberOfLines={1}>×{entry.count}</Text>
                        </View>
                        {/* Type + version label — below slot */}
                        <View style={styles.typeLabel}>
                          <Text style={styles.typeLabelText} adjustsFontSizeToFit minimumFontScale={0.7}>
                            {entry.material.type.toUpperCase()}
                            {entry.material.version > 0 ? ` V${entry.material.version}` : ""}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Encounter Rates */}
            <View style={styles.ratesBlock}>
              <Text style={styles.sectionLabel}>ENCOUNTER RATES</Text>
              <View style={styles.ratesCard}>
                {EVENT_RATES.map((e) => (
                  <View key={e.label} style={styles.rateRow}>
                    <Text style={styles.rateIcon}>{e.icon}</Text>
                    <Text style={[styles.rateLabel, { color: e.color }]}>{e.label}</Text>
                    <View style={styles.rateBarTrack}>
                      <View style={[styles.rateBarFill, { width: `${e.pct}%` as any, backgroundColor: e.color }]} />
                    </View>
                    <Text style={[styles.ratePct, { color: e.color }]}>{e.pct.toFixed(1)}%</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Material Rarity Rates */}
            <View style={styles.ratesBlock}>
              <Text style={styles.sectionLabel}>MATERIAL RARITY</Text>
              <View style={styles.ratesCard}>
                {RARITY_RATES.map((r) => (
                  <View key={r.rarity} style={styles.rateRow}>
                    <View style={[styles.rarityDot, { backgroundColor: r.color }]} />
                    <Text style={[styles.rateLabel, { color: r.color }]}>{r.rarity}</Text>
                    <View style={styles.rateBarTrack}>
                      <View
                        style={[
                          styles.rateBarFill,
                          {
                            width: `${Math.max(r.pct, 0.3)}%` as any,
                            backgroundColor: r.color,
                            minWidth: r.pct < 1 ? 3 : 0,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.ratePct, { color: r.color }]}>
                      {r.pct < 0.1 ? r.pct.toFixed(3) : r.pct < 1 ? r.pct.toFixed(2) : r.pct.toFixed(1)}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Version Rates */}
            <View style={styles.ratesBlock}>
              <Text style={styles.sectionLabel}>VERSION CHANCE</Text>
              <View style={styles.ratesCard}>
                {VERSION_RATES.map((v) => (
                  <View key={v.label} style={styles.rateRow}>
                    <View style={[styles.rarityDot, { backgroundColor: v.color }]} />
                    <Text style={[styles.rateLabel, { color: v.color }]}>{v.label}</Text>
                    <View style={styles.rateBarTrack}>
                      <View style={[styles.rateBarFill, { width: `${v.pct}%` as any, backgroundColor: v.color }]} />
                    </View>
                    <Text style={[styles.ratePct, { color: v.color }]}>{v.pct}%</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>CLOSE</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

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
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.game.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#a07820",
  },
  goldCoinText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#3d2e00",
  },
  goldVal: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  xpRow: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10,
  },
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
  statVal: { fontSize: 26, fontFamily: "Inter_700Bold" },
  statBarTrack: {
    height: 4, backgroundColor: Colors.game.border,
    borderRadius: 2, overflow: "hidden",
  },
  statBarFill: { height: "100%", borderRadius: 2 },
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
  inventoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  invSlotWrap: {
    alignItems: "center",
    gap: 4,
  },
  invSlot: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 2,
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.game.surface,
  },
  countBadge: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  countText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
  typeLabel: {
    alignItems: "center",
    width: 72,
  },
  typeLabelText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  ratesBlock: {
    gap: 8,
    marginBottom: 14,
  },
  ratesCard: {
    backgroundColor: Colors.game.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.game.border,
    gap: 9,
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rateIcon: {
    fontSize: 13,
    width: 18,
    textAlign: "center",
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rateLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    width: 72,
  },
  rateBarTrack: {
    flex: 1,
    height: 5,
    backgroundColor: Colors.game.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  rateBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  ratePct: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    width: 44,
    textAlign: "right",
  },
  closeBtn: {
    backgroundColor: Colors.game.surface,
    borderRadius: 14, paddingVertical: 14,
    alignItems: "center", marginTop: 10,
    borderWidth: 1, borderColor: Colors.game.border,
  },
  closeBtnText: {
    fontSize: 13, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 2,
  },
});
