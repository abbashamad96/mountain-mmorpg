import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { Material, RARITY_COLORS, RarityName } from "@/context/GameContext";
import {
  formatChestName,
  formatItemName,
  formatPotionName,
  GameItem,
  ItemChest,
  ITEM_QUALITY_COLORS,
  ITEM_RARITY_COLORS,
  ITEM_SLOT_ICONS,
  Potion,
} from "@/lib/items";
import {
  formatToolName,
  GatheringTool,
  TOOL_ICONS,
  TOOL_MATERIAL_MAP,
  TOOL_NAMES,
  TOOL_RARITY_COLORS,
} from "@/lib/tools";
import { ChestImage } from "./ChestImage";
import { ItemImage } from "./ItemImage";
import { MaterialImage } from "./MaterialImage";
import { PotionImage } from "./PotionImage";
import { ToolImage } from "./ToolImage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BattleDrop =
  | { type: "material"; material: Material; count: number }
  | { type: "item"; item: GameItem }
  | { type: "potion"; potion: Potion }
  | { type: "chest"; chest: ItemChest }
  | { type: "tool"; tool: GatheringTool };

interface BattleDropModalProps {
  visible: boolean;
  npcName: string;
  drops: BattleDrop[];
  onCollectAll: () => void;
  onClose: () => void;
  onListOnAh?: (drop: BattleDrop) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BattleDropModal({
  visible,
  npcName,
  drops,
  onCollectAll,
  onClose,
  onListOnAh,
}: BattleDropModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
      ]).start();
    }
  }, [visible]);

  if (!visible || drops.length === 0) return null;

  return (
    <Modal transparent visible animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.victoryLabel}>VICTORY</Text>
            <Text style={styles.npcName}>Defeated {npcName}</Text>
            <Text style={styles.lootLabel}>LOOT DROPPED</Text>
          </View>

          {/* Drops list */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {drops.map((drop, idx) => (
              <DropCard
                key={idx}
                drop={drop}
                onListOnAh={onListOnAh ? () => {
                  onListOnAh(drop);
                } : undefined}
              />
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.closeBtn} onPress={onCollectAll}>
              <Text style={styles.closeBtnText}>CLOSE</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Drop card ──────────────────────────────────────────────────────────────

function DropCard({ drop, onListOnAh }: { drop: BattleDrop; onListOnAh?: () => void }) {
  if (drop.type === "material") {
    const rc = RARITY_COLORS[drop.material.rarity];
    return (
      <View style={[styles.dropCard, { borderColor: rc + "55" }]}>
        <View style={styles.dropRow}>
          <MaterialImage
            type={drop.material.type}
            rarity={drop.material.rarity}
            version={drop.material.version}
            size={56}
            compact
            animateParticles={false}
          />
          <View style={styles.dropInfo}>
            <Text style={[styles.dropName, { color: rc }]}>
              {drop.material.rarity} {drop.material.type}
            </Text>
            <Text style={styles.dropMeta}>
              {drop.count > 1 ? `\u00d7${drop.count}  \u00b7  ` : ""}
              T{drop.material.version}
            </Text>
          </View>
          {drop.count > 1 && (
            <Text style={[styles.dropCount, { color: rc }]}>\u00d7{drop.count}</Text>
          )}
        </View>
        {onListOnAh && (
          <Pressable style={styles.ahCardBtn} onPress={onListOnAh}>
            <Text style={styles.ahCardBtnTxt}>🛒  LIST ON AH</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (drop.type === "item") {
    const rc = ITEM_RARITY_COLORS[drop.item.rarity];
    const qc = ITEM_QUALITY_COLORS[drop.item.quality];
    const hasStats = Object.values(drop.item.stats).some((v) => v > 0) ||
      Object.values(drop.item.percentStats).some((v) => v > 0);
    return (
      <View style={[styles.dropCard, { borderColor: rc + "55" }]}>
        <View style={styles.dropRow}>
          <ItemImage
            slot={drop.item.slot}
            rarity={drop.item.rarity}
            quality={drop.item.quality}
            tier={drop.item.tier}
            size={56}
          />
          <View style={styles.dropInfo}>
            <Text style={[styles.dropName, { color: rc }]} numberOfLines={1}>
              {formatItemName(drop.item)}
            </Text>
            <Text style={styles.dropMeta}>
              {ITEM_SLOT_ICONS[drop.item.slot]} {drop.item.slot}
              {drop.item.quality !== "Basic" ? `  \u00b7  ${qc}${drop.item.quality}` : ""}
            </Text>
          </View>
        </View>
        {hasStats && (
          <View style={styles.statRow}>
            {Object.entries(drop.item.stats).map(([k, v]) =>
              v > 0 ? (
                <Text key={k} style={styles.statText}>+{v} {k}</Text>
              ) : null
            )}
            {Object.entries(drop.item.percentStats).map(([k, v]) =>
              v > 0 ? (
                <Text key={`pct-${k}`} style={styles.statText}>+{(v * 100).toFixed(0)}% {k}</Text>
              ) : null
            )}
          </View>
        )}
        {onListOnAh && (
          <Pressable style={styles.ahCardBtn} onPress={onListOnAh}>
            <Text style={styles.ahCardBtnTxt}>🛒  LIST ON AH</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (drop.type === "potion") {
    const rc = ITEM_RARITY_COLORS[drop.potion.rarity];
    return (
      <View style={[styles.dropCard, { borderColor: rc + "55" }]}>
        <View style={styles.dropRow}>
          <PotionImage type={drop.potion.type} rarity={drop.potion.rarity} tier={drop.potion.tier} size={56} compact />
          <View style={styles.dropInfo}>
            <Text style={[styles.dropName, { color: rc }]} numberOfLines={1}>
              {formatPotionName(drop.potion)}
            </Text>
            <Text style={styles.dropMeta}>
              {drop.potion.type} Potion  ·  T{drop.potion.tier}
            </Text>
          </View>
        </View>
        {onListOnAh && (
          <Pressable style={styles.ahCardBtn} onPress={onListOnAh}>
            <Text style={styles.ahCardBtnTxt}>🛒  LIST ON AH</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (drop.type === "chest") {
    const rc = ITEM_RARITY_COLORS[drop.chest.rarity];
    return (
      <View style={[styles.dropCard, { borderColor: rc + "55" }]}>
        <View style={styles.dropRow}>
          <ChestImage rarity={drop.chest.rarity} size={56} />
          <View style={styles.dropInfo}>
            <Text style={[styles.dropName, { color: rc }]} numberOfLines={1}>
              {formatChestName(drop.chest)}
            </Text>
            <Text style={styles.dropMeta}>T{drop.chest.tier}  ·  Added to bag</Text>
          </View>
        </View>
        {onListOnAh && (
          <Pressable style={styles.ahCardBtn} onPress={onListOnAh}>
            <Text style={styles.ahCardBtnTxt}>🛒  LIST ON AH</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (drop.type === "tool") {
    const rc = TOOL_RARITY_COLORS[drop.tool.rarity] ?? "#9CA3AF";
    return (
      <View style={[styles.dropCard, { borderColor: rc + "55" }]}>
        <View style={styles.dropRow}>
          <ToolImage type={drop.tool.type} rarity={drop.tool.rarity} size={56} compact />
          <View style={styles.dropInfo}>
            <Text style={[styles.dropName, { color: rc }]} numberOfLines={1}>
              {formatToolName(drop.tool)}
            </Text>
            <Text style={styles.dropMeta}>
              {TOOL_ICONS[drop.tool.type]} Gathers {TOOL_MATERIAL_MAP[drop.tool.type]}
            </Text>
            <Text style={styles.dropMeta}>
              {drop.tool.effectChance}% +{drop.tool.effectMinBonus}–{drop.tool.effectMaxBonus} mats  ·  {drop.tool.passiveChance}% sweep
            </Text>
          </View>
          <View style={[styles.toolBadge, { borderColor: rc }]}>
            <Text style={[styles.toolBadgeTxt, { color: rc }]}>TOOL</Text>
          </View>
        </View>
        {onListOnAh && (
          <Pressable style={styles.ahCardBtn} onPress={onListOnAh}>
            <Text style={styles.ahCardBtnTxt}>🛒  LIST ON AH</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return null;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.86)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxHeight: "80%",
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.game.border,
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    paddingTop: 22,
    paddingBottom: 14,
    paddingHorizontal: 20,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.game.border,
  },
  victoryLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
    letterSpacing: 4,
  },
  npcName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.game.text,
  },
  lootLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textMuted,
    letterSpacing: 2,
  },
  scroll: {
    maxHeight: 280,
    padding: 14,
  },
  dropCard: {
    backgroundColor: Colors.game.surface,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  dropRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dropInfo: {
    flex: 1,
    gap: 3,
  },
  dropName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  dropMeta: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textMuted,
  },
  dropCount: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  statText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  toolBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  toolBadgeTxt: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  actions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.game.border,
  },
  closeBtn: {
    borderWidth: 1,
    borderColor: Colors.game.border,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 2,
  },
  ahCardBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.game.blue + "88",
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: "center",
    backgroundColor: Colors.game.blue + "11",
  },
  ahCardBtnTxt: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.game.blue,
    letterSpacing: 1,
  },
});
