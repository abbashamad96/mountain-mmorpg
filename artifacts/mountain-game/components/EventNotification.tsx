import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { EventRoll, VERSION_PARTICLE_COLORS, RARITY_COLORS } from "@/context/GameContext";
import { ParticleEffect } from "./ParticleEffect";
import { RarityText } from "./RarityText";

interface EventNotificationProps {
  roll: EventRoll | null;
}

export function EventNotification({ roll }: EventNotificationProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const [particleTrigger, setParticleTrigger] = useState(0);
  const currentId = useRef<string | null>(null);

  useEffect(() => {
    if (!roll || roll.id === currentId.current) return;
    currentId.current = roll.id;
    opacity.setValue(0);
    translateY.setValue(12);

    if (roll.type === "gather" && roll.material && roll.material.version > 0) {
      setParticleTrigger((p) => p + 1);
    }

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(3000),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [roll]);

  if (!roll) return null;

  const hasContent =
    roll.goldGained > 0 ||
    roll.xpGained > 0 ||
    roll.material ||
    roll.npc ||
    roll.levelsAfter > roll.levelsBefore;

  if (!hasContent) return null;

  return (
    <Animated.View
      style={[styles.card, { opacity, transform: [{ translateY }] }]}
    >
      {/* Level up */}
      {roll.levelsAfter > roll.levelsBefore && (
        <View style={styles.row}>
          <Text style={styles.levelUpText}>
            ★ LEVEL UP → Level {roll.levelsAfter}
            {roll.statPointsGained > 0 && (
              <Text style={styles.statPtText}>
                {" "}+{roll.statPointsGained} stat pt!
              </Text>
            )}
          </Text>
        </View>
      )}

      {/* Gold / XP */}
      {(roll.goldGained > 0 || roll.xpGained > 0) && (
        <View style={styles.row}>
          {roll.goldGained > 0 && (
            <View style={styles.goldRow}>
              <View style={styles.goldCoin}>
                <Text style={styles.goldCoinText}>G</Text>
              </View>
              <Text style={styles.goldText}>+{roll.goldGained} Gold</Text>
            </View>
          )}
          {roll.xpGained > 0 && (
            <Text style={styles.xpText}>+{roll.xpGained} XP</Text>
          )}
        </View>
      )}

      {/* Gathered material */}
      {roll.type === "gather" && roll.material && (
        <View style={styles.row}>
          <Text style={styles.icon}>📦</Text>
          <Text style={styles.dimText}>Gathering: </Text>
          <Text style={styles.typeText}>{roll.material.type} </Text>
          <View style={styles.particleAnchor}>
            <RarityText
              rarity={roll.material.rarity}
              version={roll.material.version}
              style={styles.rarityText}
            />
            {roll.material.version > 0 && (
              <ParticleEffect
                color={
                  VERSION_PARTICLE_COLORS[roll.material.version] !== "transparent"
                    ? VERSION_PARTICLE_COLORS[roll.material.version]
                    : RARITY_COLORS[roll.material.rarity]
                }
                trigger={particleTrigger}
                count={8}
              />
            )}
          </View>
        </View>
      )}

      {/* Battle encounter */}
      {roll.type === "battle" && roll.npc && (
        <View style={styles.row}>
          <Text style={styles.icon}>⚔</Text>
          <Text style={styles.dimText}>Encounter: </Text>
          <RarityText
            rarity={roll.npc.rarity}
            version={roll.npc.version}
            label={roll.npc.name}
            style={styles.rarityText}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Colors.game.border,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  icon: { fontSize: 13 },
  levelUpText: {
    fontSize: 14, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 0.5,
  },
  statPtText: {
    color: Colors.game.purpleLight, fontFamily: "Inter_600SemiBold",
  },
  goldRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  goldCoin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.game.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#a07820",
  },
  goldCoinText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    color: "#3d2e00",
  },
  goldText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.game.gold },
  xpText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.game.purple },
  dimText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
  typeText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.game.text },
  particleAnchor: { position: "relative", alignItems: "center", justifyContent: "center" },
  rarityText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
