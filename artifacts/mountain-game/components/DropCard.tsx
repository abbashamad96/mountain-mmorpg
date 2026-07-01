import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
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
  TOOL_RARITY_COLORS,
} from "@/lib/tools";
import { Material, RARITY_COLORS } from "@/context/GameContext";
import { ChestImage } from "./ChestImage";
import { ItemImage } from "./ItemImage";
import { MaterialImage } from "./MaterialImage";
import { PotionImage } from "./PotionImage";
import { ToolImage } from "./ToolImage";

export type DropCardDrop =
  | { type: "material"; material: Material; count: number }
  | { type: "item"; item: GameItem }
  | { type: "potion"; potion: Potion }
  | { type: "chest"; chest: ItemChest }
  | { type: "tool"; tool: GatheringTool };

interface DropCardProps {
  drop: DropCardDrop;
  onListOnAh?: () => void;
  onPress?: () => void;
  onOpenChest?: () => void;
  claimed?: boolean;
  hideHint?: boolean;
}

export function DropCard({ drop, onListOnAh, onPress, onOpenChest, claimed, hideHint }: DropCardProps) {
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
              {drop.count > 1 ? `×${drop.count}  ·  ` : ""}
              T{drop.material.version}
            </Text>
          </View>
          {drop.count > 1 && (
            <Text style={[styles.dropCount, { color: rc }]}>×{drop.count}</Text>
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
      <Pressable style={[styles.dropCard, { borderColor: rc + "55" }]} onPress={onPress}>
        {claimed && (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedTxt}>✓ IN BAG</Text>
          </View>
        )}
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
              {drop.item.quality !== "Basic" ? `  ·  ${qc}${drop.item.quality}` : ""}
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
        {!claimed && !hideHint && (
          <View style={styles.tapHint}>
            <Text style={styles.tapHintTxt}>TAP TO MANAGE →</Text>
          </View>
        )}
      </Pressable>
    );
  }

  if (drop.type === "potion") {
    const rc = ITEM_RARITY_COLORS[drop.potion.rarity];
    return (
      <Pressable style={[styles.dropCard, { borderColor: rc + "55" }]} onPress={onPress}>
        {claimed && (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedTxt}>✓ IN BAG</Text>
          </View>
        )}
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
        {!claimed && !hideHint && (
          <View style={styles.tapHint}>
            <Text style={styles.tapHintTxt}>TAP TO MANAGE →</Text>
          </View>
        )}
      </Pressable>
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
            <Text style={styles.dropMeta}>T{drop.chest.tier}</Text>
          </View>
        </View>
        {onOpenChest && (
          <Pressable style={[styles.ahCardBtn, { borderColor: rc, backgroundColor: rc + "18" }]} onPress={onOpenChest}>
            <Text style={[styles.ahCardBtnTxt, { color: rc }]}>🔓 OPEN CHEST</Text>
          </Pressable>
        )}
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
      <Pressable style={[styles.dropCard, { borderColor: rc + "55" }]} onPress={onPress}>
        {claimed && (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedTxt}>✓ IN BAG</Text>
          </View>
        )}
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
        {!claimed && !hideHint && (
          <View style={styles.tapHint}>
            <Text style={styles.tapHintTxt}>TAP TO MANAGE →</Text>
          </View>
        )}
      </Pressable>
    );
  }

  return null;
}

const styles = StyleSheet.create({
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
  ahCardBtn: {
    marginTop: 4,
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
  claimedBadge: {
    position: "absolute",
    top: 8,
    right: 10,
    backgroundColor: "rgba(76,175,80,0.18)",
    borderWidth: 1,
    borderColor: "#4CAF50",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  claimedTxt: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#4CAF50",
    letterSpacing: 0.8,
  },
  tapHint: {
    alignItems: "center",
    paddingTop: 2,
  },
  tapHintTxt: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 1,
  },
});
