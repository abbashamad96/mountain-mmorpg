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
  RarityName,
  VERSION_PARTICLE_COLORS,
} from "@/context/GameContext";
import { MaterialImage } from "./MaterialImage";
import { ParticleEffect } from "./ParticleEffect";
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
  const [attemptsLeft, setAttemptsLeft] = useState(0);
  const [gatheredCount, setGatheredCount] = useState(0);
  const [cooldown, setCooldown] = useState(false);
  const [done, setDone] = useState(false);
  const [particleTrigger, setParticleTrigger] = useState(0);

  const gatheredRef = useRef<Material[]>([]);
  const attemptsRef = useRef(0);
  const doneRef = useRef(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && material) {
      gatheredRef.current = [];
      attemptsRef.current = totalAttempts;
      doneRef.current = false;
      setAttemptsLeft(totalAttempts);
      setGatheredCount(0);
      setCooldown(false);
      setDone(false);
      setParticleTrigger(0);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 90, friction: 8 }),
      ]).start();

      // Pulse the gather button
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.97, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [visible]);

  const handleGather = () => {
    if (!material || cooldown || doneRef.current || attemptsRef.current <= 0) return;

    // Shake the material image
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
    setParticleTrigger((p) => p + 1);

    if (attemptsRef.current <= 0) {
      doneRef.current = true;
      setDone(true);
      const snapshot = [...gatheredRef.current];
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 0.85, duration: 280, useNativeDriver: true }),
        ]).start(() => onComplete(snapshot));
      }, 900);
    } else {
      setAttemptsLeft(attemptsRef.current);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 750);
    }
  };

  if (!material) return null;

  const vColor =
    VERSION_PARTICLE_COLORS[material.version] !== "transparent"
      ? VERSION_PARTICLE_COLORS[material.version]
      : RARITY_COLORS[material.rarity];

  const dotsTotal = totalAttempts;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={styles.title}>GATHERING</Text>
          <View style={styles.rarityRow}>
            <RarityText
              rarity={material.rarity}
              version={material.version}
              label={`${material.rarity} ${material.type}`}
              style={styles.rarityLabel}
            />
          </View>

          {/* Material visual */}
          <Animated.View
            style={[styles.imageWrap, { transform: [{ translateX: shakeAnim }] }]}
          >
            <MaterialImage
              type={material.type}
              rarity={material.rarity}
              version={material.version}
              size={160}
            />
            <ParticleEffect color={vColor} trigger={particleTrigger} count={12} />
          </Animated.View>

          {/* Attempt dots */}
          <View style={styles.dotsRow}>
            {Array.from({ length: dotsTotal }).map((_, i) => (
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
            <Animated.View style={{ transform: [{ scale: cooldown ? 1 : pulseAnim }] }}>
              <Pressable
                style={[
                  styles.gatherBtn,
                  { borderColor: RARITY_COLORS[material.rarity] },
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
                  {cooldown ? "•••" : "GATHER"}
                </Text>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
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
    gap: 12,
  },
  title: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 4,
  },
  rarityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rarityLabel: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  imageWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  attemptsLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  gatherBtn: {
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 40,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    minWidth: 160,
  },
  gatherBtnDisabled: {
    borderColor: Colors.game.border,
    backgroundColor: "transparent",
  },
  gatherBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
});
