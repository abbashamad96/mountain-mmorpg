import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { useGame, GameItem, ItemSlot } from "@/context/GameContext";
import {
  ITEM_RARITIES,
  ITEM_RARITY_COLORS,
  ITEM_SLOT_ICONS,
  ITEM_QUALITY_COLORS,
  formatItemName,
} from "@/lib/items";
import { ItemImage } from "./ItemImage";

interface EquipPickerModalProps {
  slot: ItemSlot | null;
  onClose: () => void;
  onEquip: (item: GameItem) => void;
}

function totalStatPoints(item: GameItem): number {
  const flat = item.stats.strength + item.stats.health + item.stats.defence + item.stats.speed;
  const pct = item.percentStats.strength + item.percentStats.health + item.percentStats.defence + item.percentStats.speed;
  return flat + pct * 100; // pct ×100 so they contribute meaningfully
}

function rarityScore(rarity: string): number {
  return ITEM_RARITIES.indexOf(rarity as any);
}

export function EquipPickerModal({ slot, onClose, onEquip }: EquipPickerModalProps) {
  const { gameState } = useGame();
  const char = gameState.character;

  const current = slot ? char.equippedItems[slot] : undefined;
  const candidates = useMemo(() => {
    if (!slot) return [];
    const items = char.itemBag.filter((i) => i.slot === slot);
    const meets = (i: GameItem) => char.level >= i.levelRequirement;
    return items.slice().sort((a, b) => {
      // 1. Rarity descending
      const rDiff = rarityScore(b.rarity) - rarityScore(a.rarity);
      if (rDiff !== 0) return rDiff;
      // 2. Total stat points descending
      const sDiff = totalStatPoints(b) - totalStatPoints(a);
      if (sDiff !== 0) return sDiff;
      // 3. Level-requirement met first
      const aOk = meets(a) ? 1 : 0;
      const bOk = meets(b) ? 1 : 0;
      return bOk - aOk;
    });
  }, [char.itemBag, slot, char.level]);

  if (!slot) return null;

  const rc = current ? ITEM_RARITY_COLORS[current.rarity] : Colors.game.border;

  return (
    <Modal transparent visible animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>{ITEM_SLOT_ICONS[slot]}</Text>
            <Text style={styles.headerTitle}>{slot.toUpperCase()}</Text>
          </View>

          {/* Currently equipped */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CURRENTLY EQUIPPED</Text>
            {current ? (
              <View style={[styles.currentRow, { borderColor: rc + "44" }]}>
                <ItemImage slot={current.slot} rarity={current.rarity} quality={current.quality} tier={current.tier} size={56} compact />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.itemName, { color: rc }]}>{formatItemName(current)}</Text>
                  <Text style={styles.itemStats}>{totalStatPoints(current)} pts</Text>
                  <View style={styles.statChipRow}>
                    {current.stats.strength > 0 && (
                      <Text style={[styles.statChip, { color: Colors.game.red }]}>⚔{current.stats.strength}</Text>
                    )}
                    {current.stats.health > 0 && (
                      <Text style={[styles.statChip, { color: Colors.game.green }]}>♥{current.stats.health}</Text>
                    )}
                    {current.stats.defence > 0 && (
                      <Text style={[styles.statChip, { color: Colors.game.blue }]}>🛡{current.stats.defence}</Text>
                    )}
                    {current.stats.speed > 0 && (
                      <Text style={[styles.statChip, { color: Colors.game.gold }]}>⚡{current.stats.speed}</Text>
                    )}
                    {current.percentStats.strength > 0 && (
                      <Text style={[styles.statChip, { color: Colors.game.red }]}>⚔+{(current.percentStats.strength * 100).toFixed(0)}%</Text>
                    )}
                    {current.percentStats.health > 0 && (
                      <Text style={[styles.statChip, { color: Colors.game.green }]}>♥+{(current.percentStats.health * 100).toFixed(0)}%</Text>
                    )}
                    {current.percentStats.defence > 0 && (
                      <Text style={[styles.statChip, { color: Colors.game.blue }]}>🛡+{(current.percentStats.defence * 100).toFixed(0)}%</Text>
                    )}
                    {current.percentStats.speed > 0 && (
                      <Text style={[styles.statChip, { color: Colors.game.gold }]}>⚡+{(current.percentStats.speed * 100).toFixed(0)}%</Text>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <Text style={styles.emptyText}>Nothing equipped</Text>
            )}
          </View>

          {/* Available items */}
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.sectionLabel}>
              {candidates.length > 0 ? `${candidates.length} AVAILABLE ITEMS` : "NO AVAILABLE ITEMS"}
            </Text>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {candidates.map((item) => {
                const irc = ITEM_RARITY_COLORS[item.rarity];
                const meets = char.level >= item.levelRequirement;
                const qColor = ITEM_QUALITY_COLORS[item.quality];
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.itemRow, { borderColor: meets ? irc + "44" : "#555" + "44" }]}
                    onPress={() => {
                      if (!meets) return;
                      onEquip(item);
                      onClose();
                    }}
                    disabled={!meets}
                  >
                    <ItemImage slot={item.slot} rarity={item.rarity} quality={item.quality} tier={item.tier} size={56} compact />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.itemName, { color: meets ? irc : "#555" }]}>
                        {formatItemName(item)}
                      </Text>
                      <View style={styles.itemMetaRow}>
                        <Text style={[styles.itemStats, { color: meets ? Colors.game.textDim : "#555" }]}>
                          {totalStatPoints(item)} pts
                        </Text>
                        {item.quality !== "Basic" && (
                          <View style={[styles.qualBadge, { borderColor: qColor + "99" }]}>
                            <Text style={[styles.qualBadgeTxt, { color: qColor }]}>{item.quality}</Text>
                          </View>
                        )}
                        {!meets && (
                          <Text style={styles.reqBadge}>Lv {item.levelRequirement}</Text>
                        )}
                      </View>
                      {/* Stat chips */}
                      <View style={styles.statChipRow}>
                        {item.stats.strength > 0 && (
                          <Text style={[styles.statChip, { color: Colors.game.red }]}>⚔{item.stats.strength}</Text>
                        )}
                        {item.stats.health > 0 && (
                          <Text style={[styles.statChip, { color: Colors.game.green }]}>♥{item.stats.health}</Text>
                        )}
                        {item.stats.defence > 0 && (
                          <Text style={[styles.statChip, { color: Colors.game.blue }]}>🛡{item.stats.defence}</Text>
                        )}
                        {item.stats.speed > 0 && (
                          <Text style={[styles.statChip, { color: Colors.game.gold }]}>⚡{item.stats.speed}</Text>
                        )}
                        {item.percentStats.strength > 0 && (
                          <Text style={[styles.statChip, { color: Colors.game.red }]}>⚔+{(item.percentStats.strength * 100).toFixed(0)}%</Text>
                        )}
                        {item.percentStats.health > 0 && (
                          <Text style={[styles.statChip, { color: Colors.game.green }]}>♥+{(item.percentStats.health * 100).toFixed(0)}%</Text>
                        )}
                        {item.percentStats.defence > 0 && (
                          <Text style={[styles.statChip, { color: Colors.game.blue }]}>🛡+{(item.percentStats.defence * 100).toFixed(0)}%</Text>
                        )}
                        {item.percentStats.speed > 0 && (
                          <Text style={[styles.statChip, { color: Colors.game.gold }]}>⚡+{(item.percentStats.speed * 100).toFixed(0)}%</Text>
                        )}
                      </View>
                    </View>
                    {!meets && (
                      <Text style={styles.lockedTxt}>🔒</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnTxt}>CLOSE</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 360,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: Colors.game.border,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },
  headerIcon: { fontSize: 22 },
  headerTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 2,
  },
  section: { gap: 6 },
  sectionLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 1.5,
  },
  list: { maxHeight: 320 },
  currentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: Colors.game.surface,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: Colors.game.surface,
    marginBottom: 6,
  },
  itemName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  itemStats: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  qualBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  qualBadgeTxt: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  reqBadge: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.game.red,
  },
  lockedTxt: {
    fontSize: 14,
    opacity: 0.4,
  },
  statChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  statChip: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
  },
  emptyText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    fontStyle: "italic",
    paddingVertical: 8,
  },
  closeBtn: {
    backgroundColor: Colors.game.surface,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  closeBtnTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 2,
  },
});
