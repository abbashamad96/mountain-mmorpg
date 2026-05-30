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
import { GameItem, ItemChest } from "@/context/GameContext";
import {
  openChest,
  ITEM_RARITY_COLORS,
  ITEM_QUALITY_COLORS,
  ITEM_SLOT_ICONS,
  formatPercent,
} from "@/lib/items";

interface ChestOpenModalProps {
  chest: ItemChest;
  onClaim: (item: GameItem) => void;
  onClose: () => void;
}

const RARITY_LABELS: Record<string, string> = {
  Common: "COMMON CHEST",
  Uncommon: "UNCOMMON CHEST",
  Rare: "RARE CHEST",
  Epic: "EPIC CHEST",
  Elite: "ELITE CHEST",
  Legendary: "LEGENDARY CHEST",
  Superior: "SUPERIOR CHEST",
  Cosmic: "COSMIC CHEST",
};

const OPEN_MESSAGES: Record<string, string> = {
  Common: "You open the chest...",
  Uncommon: "The chest creaks open!",
  Rare: "A rush of energy escapes!",
  Epic: "Power surges from within!",
  Elite: "Ancient force unleashed!",
  Legendary: "Blinding golden light!",
  Superior: "Reality fractures open!",
  Cosmic: "The cosmos pour forth!",
};

export function ChestOpenModal({ chest, onClaim, onClose }: ChestOpenModalProps) {
  const [phase, setPhase] = useState<"idle" | "opening" | "revealed">("idle");
  const [revealedItem, setRevealedItem] = useState<GameItem | null>(null);

  const shakeX    = useRef(new Animated.Value(0)).current;
  const scale     = useRef(new Animated.Value(1)).current;
  const chestOp   = useRef(new Animated.Value(1)).current;
  const glowOp    = useRef(new Animated.Value(0)).current;
  const itemOp    = useRef(new Animated.Value(0)).current;
  const itemScale = useRef(new Animated.Value(0.5)).current;

  const rc = ITEM_RARITY_COLORS[chest.rarity];

  function handleOpen() {
    const item = openChest(chest);
    setRevealedItem(item);
    setPhase("opening");

    const shakeSequence = Animated.sequence([
      Animated.timing(shakeX, { toValue: 14, duration: 65, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -14, duration: 65, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 11, duration: 65, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -11, duration: 65, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8, duration: 65, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 65, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 4, duration: 65, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 65, useNativeDriver: true }),
    ]);

    Animated.sequence([
      shakeSequence,
      Animated.parallel([
        Animated.timing(glowOp,   { toValue: 1,   duration: 180, useNativeDriver: true }),
        Animated.timing(scale,    { toValue: 1.35, duration: 180, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(chestOp, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(glowOp,  { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(scale,   { toValue: 2,   duration: 220, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setPhase("revealed");
      Animated.parallel([
        Animated.spring(itemScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }),
        Animated.timing(itemOp,   { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    });
  }

  const itemRc = revealedItem ? ITEM_RARITY_COLORS[revealedItem.rarity] : rc;
  const hasPercent = revealedItem
    ? (revealedItem.percentStats.strength > 0 || revealedItem.percentStats.health > 0 ||
       revealedItem.percentStats.defence > 0 || revealedItem.percentStats.speed > 0)
    : false;

  const STAT_ROWS: { key: keyof NonNullable<typeof revealedItem>["stats"]; label: string; icon: string }[] = [
    { key: "strength", label: "Strength", icon: "⚔" },
    { key: "health",   label: "Health",   icon: "♥" },
    { key: "defence",  label: "Defence",  icon: "🛡" },
    { key: "speed",    label: "Speed",    icon: "⚡" },
  ];

  return (
    <Modal transparent visible animationType="fade">
      <Pressable style={styles.overlay} onPress={phase === "idle" ? undefined : undefined}>
        <Pressable style={[styles.card, { borderColor: rc }]} onPress={(e) => e.stopPropagation()}>

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

              {/* Animated chest box */}
              <Animated.View
                style={[
                  styles.chestWrap,
                  {
                    transform: [{ translateX: shakeX }, { scale }],
                    opacity: chestOp,
                  },
                ]}
              >
                {/* Glow ring */}
                <Animated.View
                  style={[styles.glowRing, { backgroundColor: rc + "44", opacity: glowOp }]}
                />
                <View style={[styles.chestBox, { borderColor: rc, shadowColor: rc }]}>
                  <Text style={styles.chestEmoji}>📦</Text>
                </View>
              </Animated.View>

              {phase === "idle" && (
                <Pressable style={[styles.openBtn, { borderColor: rc }]} onPress={handleOpen}>
                  <Text style={[styles.openBtnTxt, { color: rc }]}>OPEN CHEST</Text>
                </Pressable>
              )}
              {phase === "opening" && (
                <Text style={[styles.openingMsg, { color: rc }]}>
                  {OPEN_MESSAGES[chest.rarity]}
                </Text>
              )}
            </View>
          )}

          {/* ── Revealed item phase ── */}
          {phase === "revealed" && revealedItem && (
            <Animated.View style={[styles.revealPhase, { opacity: itemOp, transform: [{ scale: itemScale }] }]}>
              <Text style={[styles.openingMsg, { color: rc }]}>{OPEN_MESSAGES[chest.rarity]}</Text>

              {/* Item header */}
              <View style={[styles.itemCard, { borderColor: itemRc }]}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemSlotIcon, { color: itemRc }]}>{ITEM_SLOT_ICONS[revealedItem.slot]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: itemRc }]}>{revealedItem.name}</Text>
                    <View style={styles.itemTagRow}>
                      <View style={[styles.tag, { borderColor: itemRc }]}>
                        <Text style={[styles.tagTxt, { color: itemRc }]}>{revealedItem.rarity.toUpperCase()}</Text>
                      </View>
                      <View style={[styles.tag, { borderColor: "#555" }]}>
                        <Text style={[styles.tagTxt, { color: "#aaa" }]}>T{revealedItem.tier}</Text>
                      </View>
                      <View style={[styles.tag, { borderColor: ITEM_QUALITY_COLORS[revealedItem.quality] }]}>
                        <Text style={[styles.tagTxt, { color: ITEM_QUALITY_COLORS[revealedItem.quality] }]}>
                          {revealedItem.quality.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Stats */}
                <ScrollView style={styles.statsScroll} showsVerticalScrollIndicator={false}>
                  {STAT_ROWS.map(({ key, label, icon }) => {
                    const flat = revealedItem.stats[key];
                    const pct  = revealedItem.percentStats[key];
                    if (flat === 0 && pct === 0) return null;
                    return (
                      <View key={key} style={styles.statRow}>
                        <Text style={styles.statIcon}>{icon}</Text>
                        <Text style={styles.statLabel}>{label}</Text>
                        {flat > 0 && <Text style={styles.flatVal}>+{flat}</Text>}
                        {pct > 0 && <Text style={styles.pctVal}>+{formatPercent(pct)}</Text>}
                      </View>
                    );
                  })}
                  {STAT_ROWS.every(({ key }) => revealedItem.stats[key] === 0 && revealedItem.percentStats[key] === 0) && (
                    <Text style={styles.noStat}>No stat bonuses</Text>
                  )}
                </ScrollView>
              </View>

              <Pressable style={[styles.claimBtn, { borderColor: itemRc, backgroundColor: itemRc + "22" }]}
                onPress={() => onClaim(revealedItem)}>
                <Text style={[styles.claimBtnTxt, { color: itemRc }]}>ADD TO BAG</Text>
              </Pressable>
            </Animated.View>
          )}

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
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 24,
    padding: 22,
    width: "100%",
    maxWidth: 340,
    borderWidth: 2,
    gap: 14,
    alignItems: "center",
  },

  chestPhase: { alignItems: "center", gap: 12, width: "100%" },
  chestTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textAlign: "center",
  },
  chestTagRow: { flexDirection: "row", gap: 8 },
  tag: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  tagTxt: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },

  chestWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  glowRing: {
    position: "absolute",
    width: 130, height: 130,
    borderRadius: 65,
  },
  chestBox: {
    width: 100, height: 100,
    borderRadius: 20,
    borderWidth: 3,
    backgroundColor: Colors.game.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  chestEmoji: { fontSize: 52 },

  openBtn: {
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginTop: 4,
  },
  openBtnTxt: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  openingMsg: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  revealPhase: { alignItems: "center", gap: 12, width: "100%" },
  itemCard: {
    width: "100%",
    backgroundColor: Colors.game.surface,
    borderRadius: 16,
    borderWidth: 2,
    padding: 14,
    gap: 10,
  },
  itemHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  itemSlotIcon: { fontSize: 26, marginTop: 2 },
  itemName: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 5 },
  itemTagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },

  statsScroll: { maxHeight: 130 },
  statRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 3, paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 6, marginBottom: 3,
  },
  statIcon: { fontSize: 13, width: 18 },
  statLabel: {
    flex: 1, fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  flatVal: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.game.green },
  pctVal:  { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  noStat: {
    fontSize: 11, fontFamily: "Inter_400Regular",
    color: Colors.game.textDim, fontStyle: "italic",
  },

  claimBtn: {
    width: "100%",
    borderWidth: 2, borderRadius: 14,
    paddingVertical: 13, alignItems: "center",
  },
  claimBtnTxt: {
    fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 2,
  },

  closeBtn: {
    width: "100%",
    backgroundColor: Colors.game.surface,
    borderRadius: 14, paddingVertical: 12,
    alignItems: "center", borderWidth: 1,
    borderColor: Colors.game.border,
  },
  closeBtnTxt: {
    fontSize: 12, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 2,
  },
});
