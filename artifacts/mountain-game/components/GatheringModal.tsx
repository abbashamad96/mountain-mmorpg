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

  useEffect(() => {
    if (visible && material) {
      gatheredRef.current = [];
      attemptsRef.current = totalAttempts;
      doneRef.current = false;
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
    }
  }, [visible]);

  const handleGather = () => {
    if (!material || cooldown || doneRef.current || attemptsRef.current <= 0) return;

    // Shake the material image on each gather
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
      setCooldown(true);
      setTimeout(() => setCooldown(false), 750);
    }
  };

  if (!material) return null;

  const vColor =
    VERSION_PARTICLE_COLORS[material.version] !== "transparent"
      ? VERSION_PARTICLE_COLORS[material.version]
      : RARITY_COLORS[material.rarity];

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

          <RarityText
            rarity={material.rarity}
            version={material.version}
            label={`${material.rarity} ${material.type}`}
            style={styles.rarityLabel}
          />

          {/* Material visual — static, no animation */}
          <View style={styles.imageWrap}>
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <MaterialImage
                type={material.type}
                rarity={material.rarity}
                version={material.version}
                size={160}
              />
            </Animated.View>
            {/* Particle burst on each gather press */}
            <View style={styles.particleAnchor} pointerEvents="none">
              <ParticleEffect
                color={vColor}
                trigger={particleTrigger}
                version={material.version > 0 ? material.version : undefined}
                count={10}
              />
            </View>
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

          {/* Gather button — plain, no pulse */}
          {!done && (
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
  particleAnchor: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center",
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
  gatherBtn: {
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 48,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    minWidth: 180,
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
