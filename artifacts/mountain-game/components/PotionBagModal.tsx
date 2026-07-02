import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { Potion, useGame } from "@/context/GameContext";
import { formatPotionName, ITEM_RARITY_COLORS } from "@/lib/items";
import { PotionImage } from "./PotionImage";

interface PotionBagModalProps {
  potion: Potion;
  onClose: () => void;
  onConsume?: () => void;
  onSellOnAh?: () => void;
}

export function PotionBagModal({ potion, onClose, onConsume, onSellOnAh }: PotionBagModalProps) {
  const { getActiveBuffMultiplier } = useGame();
  const rc = ITEM_RARITY_COLORS[potion.rarity];

  const typeLabel =
    potion.type === "Gold" ? "Gold Boost" :
    potion.type === "XP" ? "XP Boost" :
    potion.type === "Energy" ? "Energy Refill" :
    "Cooldown Reduction";
  const effectDesc = potion.type === "Gold"
    ? `Increases gold gained by ${potion.effectPercent}% for ${potion.durationSeconds}s`
    : potion.type === "XP"
    ? `Increases XP gained by ${potion.effectPercent}% for ${potion.durationSeconds}s`
    : potion.type === "Energy"
    ? `Refills ${potion.effectPercent} crafting energy points`
    : `Reduces exploration cooldown by ${potion.effectPercent}% for ${potion.durationSeconds}s`;

  const activeBuff = useMemo(() => {
    if (potion.type === "Energy") return null;
    const multiplier = getActiveBuffMultiplier(potion.type);
    if (multiplier > 1) {
      const pct = Math.round((multiplier - 1) * 100);
      return `Active: ${pct}% boost active`;
    }
    return null;
  }, [getActiveBuffMultiplier, potion.type]);

  return (
    <Modal transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={{ alignItems: "center", gap: 10, marginBottom: 8 }}>
            <PotionImage type={potion.type} rarity={potion.rarity} tier={potion.tier} size={100} />
            <Text style={[styles.name, { color: rc }]}>{formatPotionName(potion)}</Text>
            <View style={[styles.tag, { borderColor: rc, backgroundColor: rc + "18" }]}>
              <Text style={[styles.tagTxt, { color: rc }]}>{typeLabel}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={{ gap: 8, marginBottom: 12 }}>
            <Text style={styles.desc}>{effectDesc}</Text>
            <Text style={styles.tierLabel}>Tier {potion.tier} · {potion.rarity}</Text>
            {activeBuff && (
              <Text style={[styles.activeBuff, { color: Colors.game.green }]}>{activeBuff}</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Actions */}
          <View style={styles.actions}>
            {onConsume && (
              <Pressable
                style={[styles.consumeBtn, { borderColor: Colors.game.green }]}
                onPress={() => { onConsume(); onClose(); }}
              >
                <Text style={[styles.consumeBtnTxt, { color: Colors.game.green }]}>
                  CONSUME
                </Text>
              </Pressable>
            )}
            {onSellOnAh && potion.tradable && (
              <Pressable
                style={styles.ahBtn}
                onPress={() => { onSellOnAh(); onClose(); }}
              >
                <Text style={styles.ahBtnTxt}>LIST ON AH</Text>
              </Pressable>
            )}
          </View>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnTxt}>CLOSE</Text>
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
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    backgroundColor: Colors.game.surface,
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: Colors.game.border,
    gap: 10,
  },
  name: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  tag: {
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagTxt: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.game.text,
    textAlign: "center",
    lineHeight: 18,
  },
  tierLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
    textAlign: "center",
  },
  activeBuff: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.game.border,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  consumeBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: "center",
  },
  consumeBtnTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  ahBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: "center",
    borderColor: Colors.game.gold,
    backgroundColor: "rgba(201,168,76,0.10)",
  },
  ahBtnTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
    letterSpacing: 1.5,
  },
  closeBtn: {
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: Colors.game.surface,
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
