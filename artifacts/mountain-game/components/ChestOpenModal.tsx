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
  ITEM_QUALITY_COLORS,
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
import { ItemImage } from "./ItemImage";
import { PotionImage } from "./PotionImage";
import { ToolImage } from "./ToolImage";

// ─── Types ────────────────────────────────────────────────────────────────────

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

const RARITY_LABELS: Record<string, string> = {
  Common:    "COMMON CHEST",
  Uncommon:  "UNCOMMON CHEST",
  Rare:      "RARE CHEST",
  Epic:      "EPIC CHEST",
  Elite:     "ELITE CHEST",
  Legendary: "LEGENDARY CHEST",
  Superior:  "SUPERIOR CHEST",
  Cosmic:    "COSMIC CHEST",
};

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
      // 1% chance: gathering tool
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
  const dropQc = revealedDrop && isItem(revealedDrop) ? ITEM_QUALITY_COLORS[revealedDrop.quality] : "#9CA3AF";

  const ITEM_STAT_ROWS: { key: "strength" | "health" | "defence" | "speed"; label: string; icon: string }[] = [
    { key: "strength", label: "Strength", icon: "⚔" },
    { key: "health",   label: "Health",   icon: "♥" },
    { key: "defence",  label: "Defence",  icon: "🛡" },
    { key: "speed",    label: "Speed",    icon: "⚡" },
  ];

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

          {/* ── Revealed item phase ── */}
          {phase === "revealed" && revealedDrop && isItem(revealedDrop) && (
            <Animated.View style={[styles.revealPhase, { opacity: itemOp, transform: [{ scale: itemScale }] }]}>
              <Text style={[styles.openingMsg, { color: rc }]}>{OPEN_MESSAGES[chest.rarity]}</Text>
              <View style={[styles.itemCard, { borderColor: dropRc }]}>
                <View style={styles.artRow}>
                  <ItemImage
                    slot={revealedDrop.slot}
                    rarity={revealedDrop.rarity}
                    quality={revealedDrop.quality}
                    tier={revealedDrop.tier}
                    size={72}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: dropRc }]} numberOfLines={2}>
                      {formatItemName(revealedDrop)}
                    </Text>
                    {revealedDrop.quality !== "Basic" && (
                      <View style={[styles.qualBadge, { borderColor: dropQc + "99", backgroundColor: dropQc + "18" }]}>
                        <Text style={[styles.qualBadgeTxt, { color: dropQc }]}>{revealedDrop.quality.toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={styles.itemTagRow}>
                      <View style={[styles.tag, { borderColor: dropRc }]}>
                        <Text style={[styles.tagTxt, { color: dropRc }]}>{revealedDrop.rarity.toUpperCase()}</Text>
                      </View>
                      <View style={[styles.tag, { borderColor: "#555" }]}>
                        <Text style={[styles.tagTxt, { color: "#aaa" }]}>T{revealedDrop.tier}</Text>
                      </View>
                    </View>
                    <Text style={styles.npcPriceHint}>
                      🪙 NPC: {(SALVAGE_NPC_PRICES[revealedDrop.rarity as keyof typeof SALVAGE_NPC_PRICES] ?? 1000).toLocaleString()}g
                    </Text>
                  </View>
                </View>
                <ScrollView style={styles.statsScroll} showsVerticalScrollIndicator={false}>
                  {ITEM_STAT_ROWS.map(({ key, label, icon }) => {
                    const flat = revealedDrop.stats[key];
                    const pct  = revealedDrop.percentStats[key];
                    if (flat === 0 && pct === 0) return null;
                    return (
                      <View key={key} style={styles.statRow}>
                        <Text style={styles.statIcon}>{icon}</Text>
                        <Text style={styles.statLabel}>{label}</Text>
                        {flat > 0 && <Text style={styles.flatVal}>+{flat}</Text>}
                        {pct > 0 && <Text style={styles.pctVal}>+{(pct * 100).toFixed(1)}%</Text>}
                      </View>
                    );
                  })}
                  {ITEM_STAT_ROWS.every(({ key }) => revealedDrop.stats[key] === 0 && revealedDrop.percentStats[key] === 0) && (
                    <Text style={styles.noStat}>No stat bonuses</Text>
                  )}
                </ScrollView>
              </View>
              {(onEquipItem || (onSellOnAh && (revealedDrop as GameItem).tradable) || onSalvageItem || onSellItemToNpc) && (
                <View style={styles.actionBlock}>
                  {(onEquipItem || (onSellOnAh && (revealedDrop as GameItem).tradable)) && (
                    <View style={styles.actionRow}>
                      {onEquipItem && (
                        <FantasyButton label="EQUIP" icon="shield-checkmark" variant="emerald" style={styles.actionHalf} onPress={() => onEquipItem(revealedDrop as GameItem)} />
                      )}
                      {onSellOnAh && (revealedDrop as GameItem).tradable && (
                        <FantasyButton label="LIST ON AH" icon="pricetag" variant="ember" style={styles.actionHalf} onPress={onSellOnAh} />
                      )}
                    </View>
                  )}
                  {(onSalvageItem || onSellItemToNpc) && (
                    <View style={styles.actionRow}>
                      {onSalvageItem && (
                        <FantasyButton label="SALVAGE" icon="hammer" variant="dark" style={styles.actionHalf} onPress={() => onSalvageItem(revealedDrop as GameItem)} />
                      )}
                      {onSellItemToNpc && (
                        <FantasyButton label="SELL TO NPC" icon="cash" variant="emerald" style={styles.actionHalf} onPress={() => onSellItemToNpc(revealedDrop as GameItem)} />
                      )}
                    </View>
                  )}
                </View>
              )}
              <FantasyButton label="ADD TO BAG" icon="bag-add" variant="gold" fullWidth onPress={() => onClaim(revealedDrop)} />
            </Animated.View>
          )}

          {/* ── Revealed potion phase ── */}
          {phase === "revealed" && revealedDrop && isPotion(revealedDrop) && (
            <Animated.View style={[styles.revealPhase, { opacity: itemOp, transform: [{ scale: itemScale }] }]}>
              <Text style={[styles.openingMsg, { color: rc }]}>{OPEN_MESSAGES[chest.rarity]}</Text>
              <View style={[styles.itemCard, { borderColor: dropRc }]}>
                <View style={styles.artRow}>
                  <PotionImage type={revealedDrop.type} rarity={revealedDrop.rarity} tier={revealedDrop.tier} size={72} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: dropRc }]} numberOfLines={2}>
                      {formatPotionName(revealedDrop)}
                    </Text>
                    <View style={[styles.qualBadge, { borderColor: dropRc + "99", backgroundColor: dropRc + "18" }]}>
                      <Text style={[styles.qualBadgeTxt, { color: dropRc }]}>{revealedDrop.type.toUpperCase()}</Text>
                    </View>
                    <View style={styles.itemTagRow}>
                      <View style={[styles.tag, { borderColor: dropRc }]}>
                        <Text style={[styles.tagTxt, { color: dropRc }]}>{revealedDrop.rarity.toUpperCase()}</Text>
                      </View>
                      <View style={[styles.tag, { borderColor: "#555" }]}>
                        <Text style={[styles.tagTxt, { color: "#aaa" }]}>T{revealedDrop.tier}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={{ paddingVertical: 8, gap: 6 }}>
                  <Text style={[styles.potionDesc, { color: "#ccc" }]}>
                    {revealedDrop.type === "Gold" && `Increases gold gained by ${revealedDrop.effectPercent}% for ${revealedDrop.durationSeconds}s`}
                    {revealedDrop.type === "XP" && `Increases XP gained by ${revealedDrop.effectPercent}% for ${revealedDrop.durationSeconds}s`}
                    {revealedDrop.type === "Exploration" && `Reduces exploration cooldown by ${revealedDrop.effectPercent}% for ${revealedDrop.durationSeconds}s`}
                  </Text>
                </View>
              </View>
              {(onConsumePotion || (onSellOnAh && (revealedDrop as Potion).tradable)) && (
                <View style={styles.actionRow}>
                  {onConsumePotion && (
                    <FantasyButton label="CONSUME" icon="flask" variant="emerald" style={styles.actionHalf} onPress={() => onConsumePotion(revealedDrop as Potion)} />
                  )}
                  {onSellOnAh && (revealedDrop as Potion).tradable && (
                    <FantasyButton label="LIST ON AH" icon="pricetag" variant="ember" style={styles.actionHalf} onPress={onSellOnAh} />
                  )}
                </View>
              )}
              <FantasyButton label="ADD TO BAG" icon="bag-add" variant="gold" fullWidth onPress={() => onClaim(revealedDrop)} />
            </Animated.View>
          )}

          {/* ── Revealed tool phase ── */}
          {phase === "revealed" && revealedDrop && isTool(revealedDrop) && (
            <Animated.View style={[styles.revealPhase, { opacity: itemOp, transform: [{ scale: itemScale }] }]}>
              <Text style={[styles.openingMsg, { color: rc }]}>{OPEN_MESSAGES[chest.rarity]}</Text>
              <View style={[styles.itemCard, { borderColor: dropRc }]}>
                <View style={styles.artRow}>
                  <ToolImage type={revealedDrop.type} rarity={revealedDrop.rarity} size={72} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: dropRc }]} numberOfLines={2}>
                      {formatToolName(revealedDrop)}
                    </Text>
                    <View style={[styles.qualBadge, { borderColor: dropRc + "99", backgroundColor: dropRc + "18" }]}>
                      <Text style={[styles.qualBadgeTxt, { color: dropRc }]}>GATHERING TOOL</Text>
                    </View>
                    <View style={styles.itemTagRow}>
                      <View style={[styles.tag, { borderColor: dropRc }]}>
                        <Text style={[styles.tagTxt, { color: dropRc }]}>{revealedDrop.rarity.toUpperCase()}</Text>
                      </View>
                      <View style={[styles.tag, { borderColor: "#555" }]}>
                        <Text style={[styles.tagTxt, { color: "#aaa" }]}>
                          {TOOL_ICONS[revealedDrop.type]} {TOOL_MATERIAL_MAP[revealedDrop.type]}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={{ paddingVertical: 8, gap: 4 }}>
                  <Text style={[styles.potionDesc, { color: "#ccc" }]}>
                    {revealedDrop.effectChance}% chance to gain {revealedDrop.effectMinBonus}–{revealedDrop.effectMaxBonus} bonus materials per gather
                  </Text>
                  <Text style={[styles.potionDesc, { color: "#aaa" }]}>
                    {revealedDrop.passiveChance}% chance to sweep remaining attempts
                  </Text>
                </View>
              </View>
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
  tag: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
    backgroundColor: "rgba(7,4,9,0.4)",
  },
  tagTxt: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  revealPhase: { alignItems: "center", gap: 12, width: "100%" },
  itemCard: {
    width: "100%", backgroundColor: Colors.game.surface,
    borderRadius: 16, borderWidth: 1.5, padding: 14, gap: 10,
  },
  artRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  itemName: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 4, lineHeight: 20 },
  qualBadge: {
    alignSelf: "flex-start", borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2, marginBottom: 4,
  },
  qualBadgeTxt: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  itemTagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  npcPriceHint: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.game.gold, opacity: 0.8, marginTop: 3 },
  statsScroll: { maxHeight: 120 },
  statRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 3, paddingHorizontal: 8,
    backgroundColor: "rgba(201,168,76,0.06)",
    borderRadius: 6, marginBottom: 3,
  },
  statIcon: { fontSize: 13, width: 18 },
  statLabel: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.game.textDim },
  flatVal: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.game.green },
  pctVal:  { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  noStat:  { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textDim, fontStyle: "italic" },
  potionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  actionBlock: { width: "100%", gap: 8 },
  actionRow: { flexDirection: "row", gap: 8, width: "100%" },
  actionHalf: { flex: 1 },
});
