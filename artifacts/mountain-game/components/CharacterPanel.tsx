import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { Character } from "@/context/GameContext";
import { StatBar } from "./StatBar";

interface CharacterPanelProps {
  character: Character;
}

export function CharacterPanel({ character }: CharacterPanelProps) {
  const xpPercent = (character.xp / character.xpToNext) * 100;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>WANDERER</Text>
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Level </Text>
            <Text style={styles.levelValue}>{character.level}</Text>
          </View>
        </View>
        <View style={styles.xpBlock}>
          <Text style={styles.xpLabel}>XP</Text>
          <Text style={styles.xpValue}>
            {character.xp}/{character.xpToNext}
          </Text>
          <View style={styles.xpBarBg}>
            <View
              style={[styles.xpBarFill, { width: `${xpPercent}%` as any }]}
            />
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsGrid}>
        <View style={styles.statCol}>
          <StatBar
            label="Strength"
            value={character.stats.strength}
            color={Colors.game.red}
            icon="⚔"
          />
          <StatBar
            label="Defence"
            value={character.stats.defence}
            color={Colors.game.blue}
            icon="🛡"
          />
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <StatBar
            label="Health"
            value={character.stats.health}
            color={Colors.game.green}
            icon="♥"
          />
          <StatBar
            label="Speed"
            value={character.stats.speed}
            color={Colors.game.gold}
            icon="⚡"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: Colors.game.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.textMuted,
    letterSpacing: 2,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 2,
  },
  levelLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
  },
  levelValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
    lineHeight: 32,
  },
  xpBlock: {
    alignItems: "flex-end",
  },
  xpLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.textMuted,
    letterSpacing: 1,
  },
  xpValue: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
    marginTop: 2,
  },
  xpBarBg: {
    width: 80,
    height: 4,
    backgroundColor: Colors.game.border,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    backgroundColor: Colors.game.purple,
    borderRadius: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.game.border,
    marginVertical: 12,
  },
  statsGrid: {
    flexDirection: "row",
  },
  statCol: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.game.border,
    marginHorizontal: 12,
  },
});
