import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import {
  Material,
  RARITY_COLORS,
} from "@/context/GameContext";
import { MaterialImage } from "./MaterialImage";
import { RarityText } from "./RarityText";

interface GatheringModalProps {
  visible: boolean;
  material: Material | null;
  totalAttempts: number;
  onComplete: (gathered: Material[]) => void;
}

export function GatheringModal({
  visible,
  material,
  totalAttempts,
  onComplete,
}: GatheringModalProps) {
  const [gatheredCount, setGatheredCount] = useState(0);
  const [cooldown, setCooldown] = useState(false);
  const [done, setDone] = useState(false);

  const gatheredRef = useRef<Material[]>([]);
  const attemptsRef = useRef(0);
  const doneRef = useRef(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && material) {
      gatheredRef.current = [];
      attemptsRef.current = totalAttempts;
      doneRef.current = false;
      setGatheredCount(0);
      setCooldown(false);
      setDone(false);
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

    gatheredRef.current.push({ ...material });
    attemptsRef.current--;
    const count = gatheredRef.current.length;
    setGatheredCount(count);

    if (attemptsRef.current <= 0) {
      doneRef.current = true;
      setDone(true);
      const snapshot = [...gatheredRef.current];
      setTimeout(() => onComplete(snapshot), 900);
    } else {
      setCooldown(true);
      setTimeout(() => setCooldown(false), 750);
    }
  };

  const handleLeave = () => {
    if (doneRef.current) return;
    const snapshot = [...gatheredRef.current];
    onComplete(snapshot);
  };

  if (!material) return null;

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
              />
            </Animated.View>
          </View>

          {/* Attempt dots */}
          <View style={styles.dotsRow}>
            {Array.from({ length: totalAttempts }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < gatheredCount
                    ? { backgroundColor: RARITY_COLORS[material.rarity] }
                    : { backgroundColor: Colors.game.border },
                ]}
              />
            ))}
          </View>

          <Text style={styles.attemptsLabel}>
            {done
              ? `Gathered ×${gatheredCount}`
              : `${attemptsRef.current} attempt${attemptsRef.current !== 1 ? "s" : ""} remaining`}
          </Text>

          {!done && (
            <View style={styles.btnRow}>
              <Pressable
                style={[styles.leaveBtn]}
                onPress={handleLeave}
              >
                <Text style={styles.leaveBtnText}>LEAVE</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.gatherBtn,
                  { borderColor: cooldown ? Colors.game.border : RARITY_COLORS[material.rarity] },
                  cooldown && styles.gatherBtnDisabled,
                ]}
                onPress={handleGather}
                disabled={cooldown}
              >
                <Text
                  style={[
                    styles.gatherBtnText,
                    { color: cooldown ? Colors.game.textMuted : RARITY_COLORS[material.rarity] },
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
