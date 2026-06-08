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
import { GameItem, ItemChest, Potion } from "@/context/GameContext";
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
        <View style={[styles.card, { borderColor: rc }]}>

          {/* ── Chest phase ── */}
          {phase !== "revealed" && (
            <View style={styles.chestPhase}>
              <Text style={[styles.chestTitle, { color: rc }]}>{RARITY_LABELS[chest.rarity]}</Text>
              <View style={styles.chestTagRow}>
                <View style={[styles.tag, { borderColor: "#555" }]}>
                  <Text style={[styles.tagTxt, { color: "#aaa" }]}>T{chest.tier}</Text>
                </View>
                <View style={[styles.tag, { borderColor: rc }]}>
                  <Text style={[styles.tagTxt, { color: rc }]}>{chest.tradable ? "⚖ TRADABLE" : "🔒 BOUND"}</Text>
                </View>
              </View>

              <Animated.View
                style={[styles.chestWrap, { transform: [{ translateX: shakeX }, { scale }], opacity: chestOp }]}
              >
                <Animated.View style={[styles.glowRing, { backgroundColor: rc + "44", opacity: glowOp }]} />
                <View style={[styles.chestBox, { borderColor: rc, shadowColor: rc }]}>
                  <ChestImage rarity={chest.rarity} size={90} />
                </View>
              </Animated.View>

              {phase === "idle" && (
                <View style={styles.idleActions}>
                  <Pressable style={[styles.openBtn, { borderColor: rc }]} onPress={handleOpen}>
                    <Text style={[styles.openBtnTxt, { color: rc }]}>OPEN CHEST</Text>
                  </Pressable>
                  {onSellOnAh && (
                    <Pressable style={styles.sellBtn} onPress={onSellOnAh}>
                      <Text style={styles.sellBtnTxt}>SELL ON AH</Text>
                    </Pressable>
                  )}
                </View>
              )}

              {phase === "opening" && (
                <Text style={[styles.openingMsg, { color: rc }]}>
                  {OPEN_MESSAGES[chest.rarity]}
                </Text>
              )}

              {phase === "idle" && onClose && (
                <Pressable style={styles.closeBtn} onPress={onClose}>
                  <Text style={styles.closeBtnTxt}>CLOSE</Text>
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
                        <Pressable style={[styles.claimBtn, styles.actionHalf, { borderColor: dropRc, backgroundColor: dropRc + "22" }]} onPress={() => onEquipItem(revealedDrop as GameItem)}>
                          <Text style={[styles.claimBtnTxt, { color: dropRc }]}>EQUIP</Text>
                        </Pressable>
                      )}
                      {onSellOnAh && (revealedDrop as GameItem).tradable && (
                        <Pressable style={[styles.claimBtn, styles.actionHalf, styles.ahBtn]} onPress={onSellOnAh}>
                          <Text style={[styles.claimBtnTxt, styles.ahTxt]}>LIST ON AH</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                  {(onSalvageItem || onSellItemToNpc) && (
                    <View style={styles.actionRow}>
                      {onSalvageItem && (
                        <Pressable style={[styles.claimBtn, styles.actionHalf, styles.salvageBtn]} onPress={() => onSalvageItem(revealedDrop as GameItem)}>
                          <Text style={[styles.claimBtnTxt, styles.salvageTxt]}>SALVAGE</Text>
                        </Pressable>
                      )}
                      {onSellItemToNpc && (
                        <Pressable style={[styles.claimBtn, styles.actionHalf, styles.npcBtn]} onPress={() => onSellItemToNpc(revealedDrop as GameItem)}>
                          <Text style={[styles.claimBtnTxt, styles.npcTxt]}>SELL TO NPC</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              )}
              <Pressable style={[styles.claimBtn, { borderColor: dropRc, backgroundColor: dropRc + "22" }]} onPress={() => onClaim(revealedDrop)}>
                <Text style={[styles.claimBtnTxt, { color: dropRc }]}>ADD TO BAG</Text>
              </Pressable>
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
                    <Pressable style={[styles.claimBtn, styles.actionHalf, styles.consumeBtn]} onPress={() => onConsumePotion(revealedDrop as Potion)}>
                      <Text style={[styles.claimBtnTxt, styles.consumeTxt]}>CONSUME</Text>
                    </Pressable>
                  )}
                  {onSellOnAh && (revealedDrop as Potion).tradable && (
                    <Pressable style={[styles.claimBtn, styles.actionHalf, styles.ahBtn]} onPress={onSellOnAh}>
                      <Text style={[styles.claimBtnTxt, styles.ahTxt]}>LIST ON AH</Text>
                    </Pressable>
                  )}
                </View>
              )}
              <Pressable style={[styles.claimBtn, { borderColor: dropRc, backgroundColor: dropRc + "22" }]} onPress={() => onClaim(revealedDrop)}>
                <Text style={[styles.claimBtnTxt, { color: dropRc }]}>ADD TO BAG</Text>
              </Pressable>
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
              <Pressable style={[styles.claimBtn, { borderColor: dropRc, backgroundColor: dropRc + "22" }]} onPress={() => onClaim(revealedDrop)}>
                <Text style={[styles.claimBtnTxt, { color: dropRc }]}>ADD TO BAG</Text>
              </Pressable>
            </Animated.View>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center", alignItems: "center", padding: 20,
  },
  card: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 24, padding: 22,
    width: "100%", maxWidth: 340,
    borderWidth: 2, gap: 14, alignItems: "center",
  },
  chestPhase: { alignItems: "center", gap: 12, width: "100%" },
  chestTitle: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 2, textAlign: "center" },
  chestTagRow: { flexDirection: "row", gap: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  tagTxt: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  chestWrap: { alignItems: "center", justifyContent: "center", marginVertical: 4 },
  glowRing: { position: "absolute", width: 130, height: 130, borderRadius: 65 },
  chestBox: {
    width: 110, height: 110, borderRadius: 20, borderWidth: 2,
    backgroundColor: Colors.game.surface,
    alignItems: "center", justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 12, elevation: 8,
  },
  idleActions: { width: "100%", gap: 8 },
  openBtn: {
    borderWidth: 2, borderRadius: 14,
    paddingVertical: 12, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  openBtnTxt: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  sellBtn: {
    borderWidth: 1.5, borderRadius: 14,
    paddingVertical: 11, alignItems: "center",
    borderColor: "#F59E0B",
    backgroundColor: "rgba(245,158,11,0.08)",
  },
  sellBtnTxt: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1.5, color: "#F59E0B" },
  openingMsg: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center", letterSpacing: 0.5 },
  revealPhase: { alignItems: "center", gap: 12, width: "100%" },
  itemCard: {
    width: "100%", backgroundColor: Colors.game.surface,
    borderRadius: 16, borderWidth: 2, padding: 14, gap: 10,
  },
  artRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  itemName: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 4, lineHeight: 20 },
  qualBadge: {
    alignSelf: "flex-start", borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2, marginBottom: 4,
  },
  qualBadgeTxt: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  itemTagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  statsScroll: { maxHeight: 120 },
  statRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 3, paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 6, marginBottom: 3,
  },
  statIcon: { fontSize: 13, width: 18 },
  statLabel: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.game.textDim },
  flatVal: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.game.green },
  pctVal:  { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  noStat:  { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textDim, fontStyle: "italic" },
  potionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  claimBtn: { borderWidth: 2, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  claimBtnTxt: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  actionBlock: { width: "100%", gap: 8 },
  actionRow: { flexDirection: "row", gap: 8, width: "100%" },
  actionHalf: { flex: 1 },
  ahBtn: { borderColor: "#F59E0B", backgroundColor: "rgba(245,158,11,0.08)" },
  ahTxt: { color: "#F59E0B" },
  salvageBtn: { borderColor: "#7C6544", backgroundColor: "rgba(124,101,68,0.15)" },
  salvageTxt: { color: "#C4A06A" },
  npcBtn: { borderColor: "#4ade8088", backgroundColor: "rgba(74,222,128,0.08)" },
  npcTxt: { color: "#4ade80" },
  consumeBtn: { borderColor: "#4ade8088", backgroundColor: "rgba(74,222,128,0.08)" },
  consumeTxt: { color: "#4ade80" },
  closeBtn: {
    width: "100%", backgroundColor: Colors.game.surface,
    borderRadius: 14, paddingVertical: 12,
    alignItems: "center", borderWidth: 1, borderColor: Colors.game.border,
  },
  closeBtnTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 2 },
});
