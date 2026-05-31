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
import { useGame, GameItem, ItemSlot, getEffectiveStats } from "@/context/GameContext";
import {
  ITEM_SLOTS,
  ITEM_SLOT_ICONS,
  ITEM_RARITY_COLORS,
  ITEM_QUALITY_COLORS,
  formatPercent,
  sumItemStats,
  sumPercentStats,
} from "@/lib/items";
import { ItemImage } from "./ItemImage";
import { EquipPickerModal } from "./EquipPickerModal";

// ─── Item Detail Modal ────────────────────────────────────────────────────────

function EquippedItemDetail({
  item,
  onClose,
  onUnequip,
}: {
  item: GameItem;
  onClose: () => void;
  onUnequip: () => void;
}) {
  const rc = ITEM_RARITY_COLORS[item.rarity];
  const qc = ITEM_QUALITY_COLORS[item.quality];
  const hasPercent =
    item.percentStats.strength > 0 ||
    item.percentStats.health > 0 ||
    item.percentStats.defence > 0 ||
    item.percentStats.speed > 0;

  const STAT_ROWS: { key: keyof typeof item.stats; label: string; icon: string }[] = [
    { key: "strength", label: "Strength", icon: "⚔" },
    { key: "health",   label: "Health",   icon: "♥" },
    { key: "defence",  label: "Defence",  icon: "🛡" },
    { key: "speed",    label: "Speed",    icon: "⚡" },
  ];

  return (
    <Modal transparent visible animationType="fade">
      <Pressable style={styles.detailOverlay} onPress={onClose}>
        <Pressable style={[styles.detailCard, { borderColor: rc }]} onPress={(e) => e.stopPropagation()}>

          {/* Header */}
          <View style={styles.detailHeader}>
            <Text style={styles.detailSlotIcon}>{ITEM_SLOT_ICONS[item.slot]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailName, { color: rc }]}>{item.name}</Text>
              <View style={styles.detailTagRow}>
                <View style={[styles.detailTag, { borderColor: rc }]}>
                  <Text style={[styles.detailTagTxt, { color: rc }]}>{item.rarity.toUpperCase()}</Text>
                </View>
                <View style={[styles.detailTag, { borderColor: "#555" }]}>
                  <Text style={[styles.detailTagTxt, { color: "#aaa" }]}>T{item.tier}</Text>
                </View>
                <View style={[styles.detailTag, { borderColor: qc }]}>
                  <Text style={[styles.detailTagTxt, { color: qc }]}>{item.quality.toUpperCase()}</Text>
                </View>
                <View style={[styles.detailTag, { borderColor: "#555" }]}>
                  <Text style={[styles.detailTagTxt, { color: "#aaa" }]}>{item.slot.toUpperCase()}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Flat stats */}
          <View style={styles.statSection}>
            <Text style={styles.statSectionLabel}>FLAT BONUSES</Text>
            {STAT_ROWS.map(({ key, label, icon }) => {
              const val = item.stats[key];
              if (val === 0) return null;
              return (
                <View key={key} style={styles.statRow}>
                  <Text style={styles.statRowIcon}>{icon}</Text>
                  <Text style={styles.statRowLabel}>{label}</Text>
                  <Text style={[styles.statRowVal, { color: Colors.game.green }]}>+{val}</Text>
                </View>
              );
            })}
            {STAT_ROWS.every(({ key }) => item.stats[key] === 0) && (
              <Text style={styles.noStatText}>No flat bonuses</Text>
            )}
          </View>

          {/* Percent stats */}
          {hasPercent && (
            <View style={styles.statSection}>
              <Text style={styles.statSectionLabel}>% BONUSES</Text>
              {STAT_ROWS.map(({ key, label, icon }) => {
                const val = item.percentStats[key];
                if (val === 0) return null;
                return (
                  <View key={key} style={styles.statRow}>
                    <Text style={styles.statRowIcon}>{icon}</Text>
                    <Text style={styles.statRowLabel}>{label}</Text>
                    <Text style={[styles.statRowVal, { color: Colors.game.gold }]}>+{formatPercent(val)}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Level req */}
          {item.levelRequirement > 0 && (
            <Text style={styles.lvReq}>Requires Level {item.levelRequirement}</Text>
          )}

          {/* Tradable badge */}
          <View style={styles.tradableRow}>
            <Text style={styles.tradableText}>{item.tradable ? "⚖ Tradable" : "🔒 Account Bound"}</Text>
          </View>

          {/* Buttons */}
          <Pressable style={styles.unequipBtn} onPress={() => { onUnequip(); onClose(); }}>
            <Text style={styles.unequipBtnTxt}>UNEQUIP</Text>
          </Pressable>
          <Pressable style={styles.closeDetailBtn} onPress={onClose}>
            <Text style={styles.closeDetailBtnTxt}>CLOSE</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Equipment Tab ────────────────────────────────────────────────────────────

export function EquipmentTab() {
  const { gameState, unequipItem, equipItem } = useGame();
  const char = gameState.character;
  const [selected, setSelected] = useState<{ slot: ItemSlot; item: GameItem } | null>(null);
  const [pickerSlot, setPickerSlot] = useState<ItemSlot | null>(null);

  const equippedCount = Object.keys(char.equippedItems).length;
  const flatBonus = sumItemStats(char.equippedItems);
  const pctBonus  = sumPercentStats(char.equippedItems);
  const hasPct    = pctBonus.strength > 0 || pctBonus.health > 0 || pctBonus.defence > 0 || pctBonus.speed > 0;

  const effective = getEffectiveStats(char);

  const STAT_ROWS: { key: "strength" | "health" | "defence" | "speed"; label: string; icon: string; color: string }[] = [
    { key: "strength", label: "Strength", icon: "⚔", color: Colors.game.red },
    { key: "health",   label: "Health",   icon: "♥", color: Colors.game.green },
    { key: "defence",  label: "Defence",  icon: "🛡", color: Colors.game.blue },
    { key: "speed",    label: "Speed",    icon: "⚡", color: Colors.game.gold },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Slot grid ── */}
      <View style={styles.slotGrid}>
        {ITEM_SLOTS.map((slot) => {
          const item = char.equippedItems[slot];
          const rc = item ? ITEM_RARITY_COLORS[item.rarity] : Colors.game.border;
          return (
            <Pressable
              key={slot}
              style={[styles.slotCard, { borderColor: rc }]}
              onPress={() => setPickerSlot(slot)}
              onLongPress={() => item ? setSelected({ slot, item }) : undefined}
            >
              <Text style={[styles.slotIcon, { color: item ? rc : Colors.game.textMuted }]}>
                {ITEM_SLOT_ICONS[slot]}
              </Text>
              <Text style={styles.slotName}>{slot.toUpperCase()}</Text>
              {item ? (
                <>
                  <ItemImage
                    slot={item.slot}
                    rarity={item.rarity}
                    quality={item.quality}
                    tier={item.tier}
                    size={52}
                    compact
                  />
                  <Text style={[styles.slotItemName, { color: rc }]} numberOfLines={2}>{item.name}</Text>
                  <View style={styles.slotBadgeRow}>
                    <View style={[styles.slotBadge, { backgroundColor: rc + "33" }]}>
                      <Text style={[styles.slotBadgeTxt, { color: rc }]}>T{item.tier}</Text>
                    </View>
                    <View style={[styles.slotBadge, { backgroundColor: ITEM_QUALITY_COLORS[item.quality] + "33" }]}>
                      <Text style={[styles.slotBadgeTxt, { color: ITEM_QUALITY_COLORS[item.quality] }]}>
                        {item.quality[0]}
                      </Text>
                    </View>
                  </View>
                  {/* Per-item stat amounts */}
                  <View style={styles.slotStatRow}>
                    {item.stats.strength > 0 && (
                      <Text style={[styles.slotStatTxt, { color: Colors.game.red }]}>⚔{item.stats.strength}</Text>
                    )}
                    {item.stats.health > 0 && (
                      <Text style={[styles.slotStatTxt, { color: Colors.game.green }]}>♥{item.stats.health}</Text>
                    )}
                    {item.stats.defence > 0 && (
                      <Text style={[styles.slotStatTxt, { color: Colors.game.blue }]}>🛡{item.stats.defence}</Text>
                    )}
                    {item.stats.speed > 0 && (
                      <Text style={[styles.slotStatTxt, { color: Colors.game.gold }]}>⚡{item.stats.speed}</Text>
                    )}
                    {item.percentStats.strength > 0 && (
                      <Text style={[styles.slotStatTxt, { color: Colors.game.red }]}>⚔+{(item.percentStats.strength * 100).toFixed(0)}%</Text>
                    )}
                    {item.percentStats.health > 0 && (
                      <Text style={[styles.slotStatTxt, { color: Colors.game.green }]}>♥+{(item.percentStats.health * 100).toFixed(0)}%</Text>
                    )}
                    {item.percentStats.defence > 0 && (
                      <Text style={[styles.slotStatTxt, { color: Colors.game.blue }]}>🛡+{(item.percentStats.defence * 100).toFixed(0)}%</Text>
                    )}
                    {item.percentStats.speed > 0 && (
                      <Text style={[styles.slotStatTxt, { color: Colors.game.gold }]}>⚡+{(item.percentStats.speed * 100).toFixed(0)}%</Text>
                    )}
                  </View>
                </>
              ) : (
                <Text style={styles.slotEmpty}>Empty</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ── Stat summary ── */}
      {equippedCount > 0 ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>GEAR BONUS SUMMARY</Text>
          <View style={styles.divider} />
          {STAT_ROWS.map(({ key, label, icon, color }) => {
            const base = char.stats[key];
            const flat = flatBonus[key];
            const pct  = pctBonus[key];
            const eff  = effective[key];
            const hasAny = flat > 0 || pct > 0;
            if (!hasAny) return null;
            return (
              <View key={key} style={styles.summaryRow}>
                <Text style={styles.summaryIcon}>{icon}</Text>
                <Text style={[styles.summaryLabel, { color }]}>{label}</Text>
                <View style={styles.summaryVals}>
                  <Text style={styles.summaryBase}>{key === "strength" ? base.toFixed(1) : Math.floor(base)}</Text>
                  {flat > 0 && <Text style={styles.summaryBonus}> +{flat}</Text>}
                  {pct > 0 && <Text style={styles.summaryPct}> +{formatPercent(pct)}</Text>}
                  <Text style={[styles.summaryEff, { color }]}>
                    {" "}= {key === "strength" ? eff.toFixed(1) : Math.floor(eff)}
                  </Text>
                </View>
              </View>
            );
          })}
          {STAT_ROWS.every(({ key }) => flatBonus[key] === 0 && pctBonus[key] === 0) && (
            <Text style={styles.noStatText}>Equipped items have no stat bonuses yet.</Text>
          )}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No items equipped</Text>
          <Text style={styles.emptySub}>Items can be equipped from your item bag once acquired.</Text>
        </View>
      )}

      <View style={{ height: 24 }} />

      {selected && (
        <EquippedItemDetail
          item={selected.item}
          onClose={() => setSelected(null)}
          onUnequip={() => unequipItem(selected.slot)}
        />
      )}

      <EquipPickerModal
        slot={pickerSlot}
        onClose={() => setPickerSlot(null)}
        onEquip={equipItem}
      />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  slotCard: {
    width: "30%",
    flexGrow: 1,
    backgroundColor: Colors.game.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 10,
    alignItems: "center",
    gap: 4,
    minHeight: 110,
  },
  slotIcon: { fontSize: 22 },
  slotName: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 1.2,
  },
  slotItemName: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    lineHeight: 14,
  },
  slotBadgeRow: { flexDirection: "row", gap: 4, marginTop: 2 },
  slotBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  slotBadgeTxt: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
  },
  slotStatRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
    justifyContent: "center",
  },
  slotStatTxt: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
  },
  slotEmpty: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    fontStyle: "italic",
    marginTop: 4,
  },

  summaryCard: {
    backgroundColor: Colors.game.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.game.border,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 2,
  },
  divider: { height: 1, backgroundColor: Colors.game.border },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryIcon: { fontSize: 14, width: 20, textAlign: "center" },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 60 },
  summaryVals: { flex: 1, flexDirection: "row", alignItems: "baseline", flexWrap: "wrap" },
  summaryBase: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },
  summaryBonus: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.game.green },
  summaryPct:   { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.game.gold },
  summaryEff:   { fontSize: 14, fontFamily: "Inter_700Bold" },

  emptyState: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 18,
  },

  noStatText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    fontStyle: "italic",
  },

  // Detail modal
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  detailCard: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 340,
    borderWidth: 2,
    gap: 10,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  detailSlotIcon: { fontSize: 28, marginTop: 2 },
  detailName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  detailTagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  detailTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  detailTagTxt: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },

  statSection: { gap: 4 },
  statSectionLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 6,
  },
  statRowIcon: { fontSize: 13, width: 18 },
  statRowLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  statRowVal: { fontSize: 14, fontFamily: "Inter_700Bold" },

  lvReq: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textMuted,
    textAlign: "center",
  },
  tradableRow: { alignItems: "center" },
  tradableText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },

  unequipBtn: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.game.red,
  },
  unequipBtnTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.game.red,
    letterSpacing: 1.5,
  },
  closeDetailBtn: {
    backgroundColor: Colors.game.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  closeDetailBtnTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 2,
  },
});
