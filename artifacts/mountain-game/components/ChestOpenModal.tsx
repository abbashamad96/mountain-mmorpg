import React, { useRef, useState } from "react";
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
import { BannerLabel, FantasyButton, OrnatePanel } from "@/components/ui";
import { GameItem, ItemChest, Potion } from "@/context/GameContext";
import { SALVAGE_NPC_PRICES } from "@/lib/salvaging";
import {
  ChestDrop,
  formatChestName,
  formatItemName,
  formatPotionName,
  ItemRarity,
  ITEM_RARITY_COLORS,
  openChest,
} from "@/lib/items";
import {
  formatToolName,
  GatheringTool,
  rollToolDrop,
  TOOL_ICONS,
  TOOL_MATERIAL_MAP,
  TOOL_RARITY_COLORS,
} from "@/lib/tools";
import { ChestImage } from "./ChestImage";
import { DropCard } from "./DropCard";
import { ItemImage } from "./ItemImage";
import { PotionImage } from "./PotionImage";
import { ToolImage } from "./ToolImage";

// ─── Types ──────────────────────────────────────────────────────────────

export type FullChestDrop = ChestDrop | GatheringTool;

interface ChestOpenModalProps {
  chest: ItemChest;
  onClaim: (drop: FullChestDrop) => void;
  onClose?: () => void;
  onSellOnAh?: () => void;
  onEquipItem?: (item: GameItem) => void;
  onSalvageItem?: (item: GameItem) => void;
  onSellItemToNpc?: (item: GameItem) => void;
  onConsumePotion?: (potion: Potion) => void;
}

const OPEN_MESSAGES: Record<string, string> = {
  Common:    "You open the chest...",
  Uncommon:  "The chest creaks open!",
  Rare:      "A rush of energy escapes!",
  Epic:      "Power surges from within!",
  Elite:     "Ancient force unleashed!",
  Legendary: "Blinding golden light!",
  Superior:  "Reality fractures open!",
  Cosmic:    "The cosmos pour forth!",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function ChestOpenModal({ chest, onClaim, onClose, onSellOnAh, onEquipItem, onSalvageItem, onSellItemToNpc, onConsumePotion }: ChestOpenModalProps) {
  const [phase, setPhase] = useState<"idle" | "opening" | "revealed">("idle");
  const [revealedDrop, setRevealedDrop] = useState<FullChestDrop | null>(null);

  const shakeX    = useRef(new Animated.Value(0)).current;
  const scale     = useRef(new Animated.Value(1)).current;
  const chestOp   = useRef(new Animated.Value(1)).current;
  const glowOp    = useRef(new Animated.Value(0)).current;
  const itemOp    = useRef(new Animated.Value(0)).current;
  const itemScale = useRef(new Animated.Value(0.5)).current;

  const rc = ITEM_RARITY_COLORS[chest.rarity];
  const isItem   = (d: FullChestDrop): d is GameItem   => "slot" in d;
  const isPotion = (d: FullChestDrop): d is Potion      => "type" in d && "durationSeconds" in d;
  const isTool   = (d: FullChestDrop): d is GatheringTool => "effectChance" in d;

  function handleOpen() {
    let drop: FullChestDrop;
    if (Math.random() < 0.01) {
      drop = rollToolDrop(chest.rarity, chest.tier);
    } else {
      drop = openChest(chest);
    }
    setRevealedDrop(drop);
    setPhase("opening");

    const shakeSequence = Animated.sequence([
      Animated.timing(shakeX, { toValue: 14,  duration: 65, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -14, duration: 65, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 11,  duration: 65, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -11, duration: 65, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8,   duration: 65, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8,  duration: 65, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 4,   duration: 65, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,   duration: 65, useNativeDriver: true }),
    ]);

    Animated.sequence([
      shakeSequence,
      Animated.parallel([
        Animated.timing(glowOp, { toValue: 1,    duration: 180, useNativeDriver: true }),
        Animated.timing(scale,  { toValue: 1.35, duration: 180, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(chestOp, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(glowOp,  { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(scale,   { toValue: 2, duration: 220, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setPhase("revealed");
      Animated.parallel([
        Animated.spring(itemScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }),
        Animated.timing(itemOp,   { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    });
  }

  const dropRc = revealedDrop
    ? isTool(revealedDrop)
      ? (TOOL_RARITY_COLORS[revealedDrop.rarity] ?? "#9CA3AF")
      : ITEM_RARITY_COLORS[(revealedDrop as any).rarity as ItemRarity]
    : rc;

  const dropCardDrop = revealedDrop
    ? isItem(revealedDrop)
      ? { type: "item" as const, item: revealedDrop }
      : isPotion(revealedDrop)
      ? { type: "potion" as const, potion: revealedDrop }
      : isTool(revealedDrop)
      ? { type: "tool" as const, tool: revealedDrop }
      : null
    : null;

  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.overlay}>
        <OrnatePanel accent={rc} glow padding={20} style={styles.cardWrap} contentStyle={styles.card}>

          {/* ── Chest phase ── */}
          {phase !== "revealed" && (
            <View style={styles.chestPhase}>
              {/* Header matching BattleDropModal style */}
              <View style={styles.header}>
                <Text style={styles.victoryLabel}>CHEST FOUND</Text>
                <Text style={[styles.npcName, { color: rc }]}>{formatChestName(chest)}</Text>
                <Text style={styles.lootLabel}>TAP TO MANAGE</Text>
              </View>

              {/* Drop card matching BattleDropModal */}
              <Animated.View style={[styles.dropCard, { borderColor: rc + "55", opacity: chestOp }]}>
                <View style={styles.dropRow}>
                  <ChestImage rarity={chest.rarity} size={56} />
                  <View style={styles.dropInfo}>
                    <Text style={[styles.dropName, { color: rc }]} numberOfLines={1}>
                      {formatChestName(chest)}
                    </Text>
                    <Text style={styles.dropMeta}>T{chest.tier}  ·  {chest.tradable ? "⚖ TRADABLE" : "🔒 BOUND"}</Text>
                  </View>
                </View>

                {phase === "idle" && (
                  <>
                    <Pressable
                      style={[styles.ahCardBtn, { borderColor: rc, backgroundColor: rc + "18" }]}
                      onPress={handleOpen}
                    >
                      <Text style={[styles.ahCardBtnTxt, { color: rc }]}>🔓 OPEN CHEST</Text>
                    </Pressable>
                    {onSellOnAh && (
                      <Pressable style={styles.ahCardBtn} onPress={onSellOnAh}>
                        <Text style={styles.ahCardBtnTxt}>🛒  SELL ON AH</Text>
                      </Pressable>
                    )}
                  </>
                )}

                {phase === "opening" && (
                  <Text style={[styles.openingMsg, { color: rc }]}>
                    {OPEN_MESSAGES[chest.rarity]}
                  </Text>
                )}
              </Animated.View>

              {phase === "idle" && onClose && (
                <Pressable style={styles.closeBtn} onPress={onClose}>
                  <Text style={styles.closeBtnText}>CLOSE</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* ── Revealed phase ── */}
          {phase === "revealed" && dropCardDrop && revealedDrop && (
            <Animated.View style={[styles.revealPhase, { opacity: itemOp, transform: [{ scale: itemScale }] }]}>
              <Text style={[styles.openingMsg, { color: rc }]}>{OPEN_MESSAGES[chest.rarity]}</Text>

              <View style={{ width: "100%" }}>
                <DropCard drop={dropCardDrop} hideHint />
              </View>

              {/* Item actions */}
              {isItem(revealedDrop) && (
                <>
                  {(onEquipItem || (onSellOnAh && revealedDrop.tradable) || onSalvageItem || onSellItemToNpc) && (
                    <View style={styles.actionBlock}>
                      {(onEquipItem || (onSellOnAh && revealedDrop.tradable)) && (
                        <View style={styles.actionRow}>
                          {onEquipItem && (
                            <FantasyButton label="EQUIP" icon="shield-checkmark" variant="emerald" style={styles.actionHalf} onPress={() => onEquipItem(revealedDrop)} />
                          )}
                          {onSellOnAh && revealedDrop.tradable && (
                            <FantasyButton label="LIST ON AH" icon="pricetag" variant="ember" style={styles.actionHalf} onPress={onSellOnAh} />
                          )}
                        </View>
                      )}
                      {(onSalvageItem || onSellItemToNpc) && (
                        <View style={styles.actionRow}>
                          {onSalvageItem && (
                            <FantasyButton label="SALVAGE" icon="hammer" variant="dark" style={styles.actionHalf} onPress={() => onSalvageItem(revealedDrop)} />
                          )}
                          {onSellItemToNpc && (
                            <FantasyButton label="SELL TO NPC" icon="cash" variant="emerald" style={styles.actionHalf} onPress={() => onSellItemToNpc(revealedDrop)} />
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}

              {/* Potion actions */}
              {isPotion(revealedDrop) && (
                <>
                  {(onConsumePotion || (onSellOnAh && revealedDrop.tradable)) && (
                    <View style={styles.actionRow}>
                      {onConsumePotion && (
                        <FantasyButton label="CONSUME" icon="flask" variant="emerald" style={styles.actionHalf} onPress={() => onConsumePotion(revealedDrop)} />
                      )}
                      {onSellOnAh && revealedDrop.tradable && (
                        <FantasyButton label="LIST ON AH" icon="pricetag" variant="ember" style={styles.actionHalf} onPress={onSellOnAh} />
                      )}
                    </View>
                  )}
                </>
              )}

              <FantasyButton label="ADD TO BAG" icon="bag-add" variant="gold" fullWidth onPress={() => onClaim(revealedDrop)} />
            </Animated.View>
          )}

        </OrnatePanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(7,4,9,0.8)",
    justifyContent: "center", alignItems: "center", padding: 20,
  },
  cardWrap: { width: "100%", maxWidth: 420 },
  card: { gap: 14, alignItems: "center" },
  chestPhase: { alignItems: "center", gap: 12, width: "100%" },
  header: {
    alignItems: "center",
    paddingTop: 14, paddingBottom: 8,
    paddingHorizontal: 20,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.game.border,
  },
  victoryLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 4,
  },
  npcName: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.game.text },
  lootLabel: {
    fontSize: 10, fontFamily: "Inter_500Medium",
    color: Colors.game.textMuted, letterSpacing: 2,
  },
  dropCard: {
    backgroundColor: Colors.game.surface,
    borderRadius: 12, borderWidth: 1,
    padding: 12, gap: 8,
    width: "100%",
  },
  dropRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dropInfo: { flex: 1, gap: 3 },
  dropName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  dropMeta: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.game.textMuted },
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
    fontSize: 11, fontFamily: "Inter_700Bold",
    color: Colors.game.blue, letterSpacing: 1,
  },
  closeBtn: {
    width: "100%",
    borderRadius: 14, paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1, borderColor: Colors.game.border,
  },
  closeBtnText: {
    fontSize: 13, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 2,
  },
  openingMsg: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center", letterSpacing: 0.5 },
  revealPhase: { alignItems: "center", gap: 12, width: "100%" },
  actionBlock: { width: "100%", gap: 8 },
  actionRow: { flexDirection: "row", gap: 8, width: "100%" },
  actionHalf: { flex: 1 },
});
