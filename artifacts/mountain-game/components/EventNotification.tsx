import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { EventOutcome, VERSION_PARTICLE_COLORS } from "@/context/GameContext";
import { ParticleEffect } from "./ParticleEffect";
import { RarityText } from "./RarityText";

interface EventNotificationProps {
  outcome: EventOutcome | null;
}

export function EventNotification({ outcome }: EventNotificationProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const particleTrigger = useRef(0);
  const [trigger, setTrigger] = React.useState(0);
  const currentId = useRef<string | null>(null);

  useEffect(() => {
    if (!outcome || outcome.id === currentId.current) return;
    currentId.current = outcome.id;
    opacity.setValue(0);
    translateY.setValue(16);

    if (outcome.gathered && outcome.gathered.version > 0) {
      particleTrigger.current += 1;
      setTrigger(particleTrigger.current);
    }

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
      Animated.delay(3200),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [outcome]);

  if (!outcome) return null;

  const hasGold = outcome.goldGained > 0;
  const hasXp = outcome.xpGained > 0;
  const leveled = outcome.levelsAfter > outcome.levelsBefore;
  const hasGather = !!outcome.gathered;
  const hasNpc = !!outcome.npc;
  const hasAny = hasGold || hasXp || hasGather || hasNpc || leveled;

  if (!hasAny) return null;

  return (
    <Animated.View
      style={[styles.card, { opacity, transform: [{ translateY }] }]}
    >
      {leveled && (
        <View style={styles.row}>
          <Text style={styles.levelUpText}>
            ★ LEVEL UP → Level {outcome.levelsAfter}
            {outcome.statPointsGained > 0 && (
              <Text style={styles.statPointText}>
                {" "}(+{outcome.statPointsGained} stat point{outcome.statPointsGained > 1 ? "s" : ""}!)
              </Text>
            )}
          </Text>
        </View>
      )}

      {(hasGold || hasXp) && (
        <View style={styles.row}>
          <Text style={styles.sectionIcon}>⚡</Text>
          <View style={styles.lootChips}>
            {hasGold && (
              <Text style={styles.goldChip}>+{outcome.goldGained} Gold</Text>
            )}
            {hasXp && (
              <Text style={styles.xpChip}>+{outcome.xpGained} XP</Text>
            )}
          </View>
        </View>
      )}

      {hasGather && outcome.gathered && (
        <View style={styles.row}>
          <Text style={styles.sectionIcon}>📦</Text>
          <Text style={styles.gatherLabel}>Gathered: </Text>
          <Text style={styles.gatherType}>{outcome.gathered.type} </Text>
          <View style={styles.particleAnchor}>
            <RarityText
              rarity={outcome.gathered.rarity}
              version={outcome.gathered.version}
              style={styles.rarityText}
            />
            {outcome.gathered.version > 0 && (
              <ParticleEffect
                color={VERSION_PARTICLE_COLORS[outcome.gathered.version]}
                trigger={trigger}
                count={6}
              />
            )}
          </View>
        </View>
      )}

      {hasNpc && outcome.npc && (
        <View style={styles.row}>
          <Text style={styles.sectionIcon}>⚔</Text>
          <Text style={styles.gatherLabel}>Defeated </Text>
          <RarityText
            rarity={outcome.npc.rarity}
            version={outcome.npc.version}
            label={`${outcome.npc.rarity} Enemy`}
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
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.game.border,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  sectionIcon: {
    fontSize: 13,
    marginRight: 2,
  },
  levelUpText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
    letterSpacing: 0.5,
  },
  statPointText: {
    color: Colors.game.purpleLight,
    fontFamily: "Inter_600SemiBold",
  },
  lootChips: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  goldChip: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.gold,
  },
  xpChip: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.purple,
  },
  gatherLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
  },
  gatherType: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.text,
  },
  particleAnchor: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  rarityText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
