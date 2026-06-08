import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { Material, RARITY_COLORS } from "@/context/GameContext";
import { GatheringTool, TOOL_RARITY_COLORS, TOOL_NAMES } from "@/lib/tools";
import { MaterialImage } from "./MaterialImage";
import { RarityText } from "./RarityText";
import { ToolImage } from "./ToolImage";

interface GatheringModalProps {
  visible: boolean;
  material: Material | null;
  totalAttempts: number;
  xpToNext: number;
  equippedTool?: GatheringTool | null;
  onComplete: (gathered: Material[]) => void;
  onAttemptXp: (xp: number) => void;
}

export function GatheringModal({
  visible,
  material,
  totalAttempts,
  xpToNext,
  equippedTool,
  onComplete,
  onAttemptXp,
}: GatheringModalProps) {
  const [attemptsCompleted, setAttemptsCompleted] = useState(0);
  const [totalGathered, setTotalGathered] = useState(0);
  const [cooldown, setCooldown] = useState(false);
  const [done, setDone] = useState(false);
  const [bonusText, setBonusText] = useState("");
  const [passiveText, setPassiveText] = useState("");

  const gatheredRef = useRef<Material[]>([]);
  const attemptsRef = useRef(0);
  const attemptsCompletedRef = useRef(0);
  const doneRef = useRef(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && material) {
      gatheredRef.current = [];
      attemptsRef.current = totalAttempts;
      attemptsCompletedRef.current = 0;
      doneRef.current = false;
      setAttemptsCompleted(0);
      setTotalGathered(0);
      setCooldown(false);
      setDone(false);
      setBonusText("");
      setPassiveText("");
    }
  }, [visible]);

  const handleGather = () => {
    if (!material || cooldown || doneRef.current || attemptsRef.current <= 0) return;

    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();

    const xpGained = Math.max(1, Math.floor(xpToNext * (0.02 + Math.random() * 0.015)));
    onAttemptXp(xpGained);

    // 1 material per node (node count was determined by tool at event start)
    gatheredRef.current.push({ ...material });
    setBonusText("");

    attemptsRef.current--;
    attemptsCompletedRef.current++;

    // Tool passive: % chance to auto-complete remaining nodes
    let passiveFired = false;
    if (equippedTool && attemptsRef.current > 0 && Math.random() * 100 < equippedTool.passiveChance) {
      passiveFired = true;
      const remaining = attemptsRef.current;
      while (attemptsRef.current > 0) {
        const passXp = Math.max(1, Math.floor(xpToNext * (0.02 + Math.random() * 0.015)));
        onAttemptXp(passXp);
        gatheredRef.current.push({ ...material });
        attemptsRef.current--;
        attemptsCompletedRef.current++;
      }
      setPassiveText(`⚡ ${remaining} swept!`);
    }

    setAttemptsCompleted(attemptsCompletedRef.current);
    setTotalGathered(gatheredRef.current.length);

    if (attemptsRef.current <= 0) {
      doneRef.current = true;
      setDone(true);
      const snapshot = [...gatheredRef.current];
      setTimeout(() => onComplete(snapshot), passiveFired ? 1200 : 900);
    } else {
      setCooldown(true);
      setTimeout(() => {
        setCooldown(false);
      }, 750);
    }
  };

  const handleLeave = () => {
    if (doneRef.current) return;
    const snapshot = [...gatheredRef.current];
    onComplete(snapshot);
  };

  if (!material) return null;

  const rarityColor = RARITY_COLORS[material.rarity];
  const toolColor = equippedTool ? (TOOL_RARITY_COLORS[equippedTool.rarity] ?? "#9CA3AF") : null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>GATHERING</Text>

          <RarityText
            rarity={material.rarity}
            version={material.version}
            label={`${material.rarity} ${material.type}`}
            style={styles.rarityLabel}
          />

          <View style={styles.imageWrap}>
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <MaterialImage
                type={material.type}
                rarity={material.rarity}
                version={material.version}
                size={160}
                animateParticles={Platform.OS === "web"}
              />
            </Animated.View>
          </View>

          {/* Tool indicator */}
          {equippedTool && (
            <View style={[styles.toolBar, { borderColor: toolColor! + "66" }]}>
              <ToolImage type={equippedTool.type} rarity={equippedTool.rarity} size={34} compact />
              <View style={styles.toolInfo}>
                <Text style={[styles.toolName, { color: toolColor! }]}>
                  {equippedTool.rarity} {TOOL_NAMES[equippedTool.type]}
                </Text>
                <Text style={styles.toolStats}>
                  {equippedTool.effectMinBonus}–{equippedTool.effectMaxBonus} nodes · {equippedTool.effectChance}% +1 extra · {equippedTool.passiveChance}% auto-sweep
                </Text>
              </View>
              {bonusText !== "" && (
                <View style={[styles.bonusBadge, { backgroundColor: toolColor! + "28", borderColor: toolColor! }]}>
                  <Text style={[styles.bonusTxt, { color: toolColor! }]}>{bonusText}!</Text>
                </View>
              )}
            </View>
          )}

          {/* Passive fired text */}
          {passiveText !== "" && (
            <Text style={styles.passiveText}>{passiveText}</Text>
          )}

          {/* Attempt dots */}
          <View style={styles.dotsRow}>
            {Array.from({ length: totalAttempts }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < attemptsCompleted
                    ? { backgroundColor: rarityColor }
                    : { backgroundColor: Colors.game.border },
                ]}
              />
            ))}
          </View>

          <Text style={styles.attemptsLabel}>
            {done
              ? `Gathered ×${totalGathered}`
              : `${attemptsRef.current} attempt${attemptsRef.current !== 1 ? "s" : ""} remaining`}
          </Text>

          {!done && (
            <View style={styles.btnRow}>
              <Pressable style={[styles.leaveBtn]} onPress={handleLeave}>
                <Text style={styles.leaveBtnText}>LEAVE</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.gatherBtn,
                  { borderColor: cooldown ? Colors.game.border : rarityColor },
                  cooldown && styles.gatherBtnDisabled,
                ]}
                onPress={handleGather}
                disabled={cooldown}
              >
                <Text
                  style={[
                    styles.gatherBtnText,
                    { color: cooldown ? Colors.game.textMuted : rarityColor },
                  ]}
                >
                  {cooldown ? "• • •" : "GATHER"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.game.border,
    gap: 14,
  },
  title: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 4,
  },
  rarityLabel: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  imageWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  toolBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: "stretch",
  },
  toolInfo: {
    flex: 1,
    gap: 2,
  },
  toolName: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  toolStats: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textMuted,
  },
  bonusBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bonusTxt: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  passiveText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
    letterSpacing: 1,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 10,
  },
  dot: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
  },
  attemptsLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  leaveBtn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 14,
    borderColor: Colors.game.border,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  leaveBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 2,
  },
  gatherBtn: {
    flex: 2,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
  },
  gatherBtnDisabled: {
    backgroundColor: "transparent",
  },
  gatherBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
});
