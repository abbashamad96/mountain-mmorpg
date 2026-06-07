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
  GameItem,
  ItemChest,
  ITEM_QUALITY_COLORS,
  ITEM_RARITY_COLORS,
  ITEM_SLOT_ICONS,
} from "@/lib/items";
import { ChestImage } from "./ChestImage";
import { ItemImage } from "./ItemImage";
import { MaterialImage } from "./MaterialImage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BattleDrop =
  | { type: "material"; material: Material; count: number }
  | { type: "item"; item: GameItem }
  | { type: "chest"; chest: ItemChest };

interface BattleDropModalProps {
  visible: boolean;
  npcName: string;
  drops: BattleDrop[];
  onCollectAll: () => void;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BattleDropModal({
  visible,
  npcName,
  drops,
  onCollectAll,
  onClose,
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
              <DropCard key={idx} drop={drop} />
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.collectBtn} onPress={onCollectAll}>
              <Text style={styles.collectBtnText}>COLLECT ALL</Text>
            </Pressable>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>CLOSE</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Drop card ──────────────────────────────────────────────────────────────

function DropCard({ drop }: { drop: BattleDrop }) {
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
          <Text style={[styles.dropCount, { color: rc }]}>\u00d7{drop.count}</Text>
        </View>
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
      </View>
    );
  }

  // chest
  const rc = ITEM_RARITY_COLORS[drop.chest.rarity];
  return (
    <View style={[styles.dropCard, { borderColor: rc + "55" }]}>
      <View style={styles.dropRow}>
        <ChestImage rarity={drop.chest.rarity} size={56} />
        <View style={styles.dropInfo}>
          <Text style={[styles.dropName, { color: rc }]} numberOfLines={1}>
            {formatChestName(drop.chest)}
          </Text>
          <Text style={styles.dropMeta}>
            T{drop.chest.tier}  \u00b7  {drop.chest.tradable ? "Tradable" : "Bound"}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "85%",
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.game.border,
    gap: 12,
  },
  header: {
    alignItems: "center",
    gap: 4,
    paddingBottom: 4,
  },
  victoryLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
    letterSpacing: 6,
  },
  npcName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  lootLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 3,
    marginTop: 4,
  },
  scroll: {
    maxHeight: 380,
  },
  actions: {
    gap: 8,
    paddingTop: 4,
  },
  collectBtn: {
    backgroundColor: Colors.game.green,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  collectBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 3,
  },
  closeBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.game.border,
    backgroundColor: Colors.game.surface,
  },
  closeBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 2,
  },
  dropCard: {
    backgroundColor: Colors.game.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  dropRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dropInfo: {
    flex: 1,
    gap: 2,
  },
  dropName: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  dropMeta: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textMuted,
  },
  dropCount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.game.border,
  },
  statText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textDim,
  },
});
