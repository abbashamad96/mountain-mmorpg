import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { Material, RARITY_COLORS } from "@/context/GameContext";
import { CRAFTING_MAX_ENERGY } from "@/lib/crafting";
import { GatheringTool, TOOL_RARITY_COLORS, TOOL_NAMES, TOOL_ICONS, MATERIAL_TO_TOOL } from "@/lib/tools";
import { MaterialImage } from "./MaterialImage";
import { RarityText } from "./RarityText";
import { ToolImage } from "./ToolImage";
import { FantasyButton, OrnatePanel, GemBar, BannerLabel } from "@/components/ui";

interface GatheringModalProps {
  visible: boolean;
  material: Material | null;
  totalAttempts: number;
  xpToNext: number;
  equippedTool?: GatheringTool | null;
  sweepCharges?: number;
  maxEnergy?: number;
  onComplete: (gathered: Material[]) => void;
  onAttemptXp: (xp: number) => void;
  onSweep?: () => void;
}

export function GatheringModal({
  visible,
  material,
  totalAttempts,
  xpToNext,
  equippedTool,
  sweepCharges = 0,
  maxEnergy = CRAFTING_MAX_ENERGY,
  onComplete,
  onAttemptXp,
  onSweep,
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

  const handleSweep = () => {
    if (!material || doneRef.current || attemptsRef.current <= 0 || sweepCharges <= 0) return;
    onSweep?.();
    const remaining = attemptsRef.current;
    while (attemptsRef.current > 0) {
      const xp = Math.max(1, Math.floor(xpToNext * (0.02 + Math.random() * 0.015)));
      onAttemptXp(xp);
      gatheredRef.current.push({ ...material });
      attemptsRef.current--;
      attemptsCompletedRef.current++;
    }
    setPassiveText(`⚡ ${remaining} swept!`);
    setAttemptsCompleted(attemptsCompletedRef.current);
    setTotalGathered(gatheredRef.current.length);
    doneRef.current = true;
    setDone(true);
    const snapshot = [...gatheredRef.current];
    setTimeout(() => onComplete(snapshot), 1200);
  };

  if (!material) return null;

  const rarityColor = RARITY_COLORS[material.rarity];
  const toolColor = equippedTool ? (TOOL_RARITY_COLORS[equippedTool.rarity] ?? "#9CA3AF") : null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.cardWrap}>
          <OrnatePanel style={styles.cardInner} contentStyle={styles.card} padding={22} glow>
          <BannerLabel title="Gathering" icon={material.type === "Wood" ? "leaf" : material.type === "Ore" ? "flame" : material.type === "Herb" ? "leaf" : "shirt"} size="md" />

          <RarityText
            rarity={material.rarity}
            version={material.version}
            label={`${material.rarity} ${material.type}`}
            style={styles.rarityLabel}
          />

          <View style={[styles.imageWrap, { borderColor: rarityColor + "55" }]}>
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
                    ? { backgroundColor: rarityColor, borderColor: rarityColor }
                    : { backgroundColor: Colors.game.surfaceHi, borderColor: Colors.game.border },
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
            <View style={{ width: "100%", gap: 12 }}>
              {/* Energy indicator (shared pool — sweep costs 1 energy) */}
              <View style={styles.sweepChargesRow}>
                <Text style={styles.sweepChargesLabel}>⚡ Energy: {sweepCharges}/{maxEnergy}</Text>
                <GemBar progress={Math.min(1, sweepCharges / maxEnergy)} gem="sapphire" height={7} style={styles.energyBar} />
              </View>

              <View style={styles.btnRow}>
                <FantasyButton
                  label="LEAVE"
                  icon="exit-outline"
                  variant="dark"
                  size="md"
                  onPress={handleLeave}
                  style={styles.leaveBtn}
                />

                <FantasyButton
                  label={cooldown ? "• • •" : "GATHER"}
                  icon={equippedTool ? (equippedTool.type === "Axe" ? "hammer" : equippedTool.type === "Pickaxe" ? "construct" : equippedTool.type === "SkinningKnife" ? "cut" : "leaf") : "hand-left"}
                  variant="gold"
                  size="md"
                  onPress={handleGather}
                  disabled={cooldown}
                  glow={!cooldown}
                  style={styles.gatherBtn}
                />
              </View>

              <FantasyButton
                label="SWEEP"
                icon="flash"
                variant="amethyst"
                size="md"
                onPress={handleSweep}
                disabled={sweepCharges <= 0}
                style={styles.sweepBtn}
              />
            </View>
          )}
        </OrnatePanel>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(7,4,9,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  cardWrap: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  cardInner: {
    width: "100%",
  },
  card: {
    alignItems: "center",
    gap: 14,
  },
  rarityLabel: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  imageWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: Colors.game.backgroundDeep,
    padding: 8,
  },
  toolBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.game.surface,
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
  sweepChargesRow: {
    alignSelf: "stretch",
    paddingHorizontal: 4,
    gap: 5,
  },
  sweepChargesLabel: {
    fontSize: 11, fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  energyBar: {
    alignSelf: "stretch",
  },
  sweepBtn: {
    flex: 1,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 10,
  },
  dot: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 1,
  },
  attemptsLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  leaveBtn: {
    flex: 1,
  },
  gatherBtn: {
    flex: 2,
  },
});
