import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { Character } from "@/context/GameContext";
import { StatBar } from "./StatBar";

interface CharacterPanelProps {
  character: Character;
  onStatAllocPress?: () => void;
}

export function CharacterPanel({ character, onStatAllocPress }: CharacterPanelProps) {
  const xpPct = Math.min(100, (character.xp / character.xpToNext) * 100);
  const hasPending = character.pendingStatPoints > 0;

  return (
    <View style={styles.panel}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.nameLabel}>WANDERER</Text>
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Lv </Text>
            <Text style={styles.levelValue}>{character.level}</Text>
          </View>
        </View>

        <View style={styles.rightBlock}>
          <View style={styles.goldRow}>
            <Text style={styles.goldIcon}>🪙</Text>
            <Text style={styles.goldValue}>{character.gold.toLocaleString()}</Text>
          </View>
          {hasPending && (
            <View style={styles.statPointBadge}>
              <Text style={styles.statPointText} onPress={onStatAllocPress}>
                +{character.pendingStatPoints} STAT POINT{character.pendingStatPoints > 1 ? "S" : ""}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.xpRow}>
        <Text style={styles.xpLabel}>XP</Text>
        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${xpPct}%` as any }]} />
        </View>
        <Text style={styles.xpNumbers}>
          {character.xp}/{character.xpToNext}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsGrid}>
        <View style={styles.statCol}>
          <StatBar label="Strength" value={character.stats.strength} color={Colors.game.red} icon="⚔" />
          <StatBar label="Defence" value={character.stats.defence} color={Colors.game.blue} icon="🛡" />
        </View>
        <View style={styles.statSep} />
        <View style={styles.statCol}>
          <StatBar label="Health" value={character.stats.health} color={Colors.game.green} icon="♥" />
          <StatBar label="Speed" value={character.stats.speed} color={Colors.game.gold} icon="⚡" />
        </View>
      </View>

      <View style={styles.blockRow}>
        <Text style={styles.blockIcon}>🛡</Text>
        <Text style={styles.blockLabel}>Block Rate</Text>
        <Text style={styles.blockValue}>{((character.stats.defence / (character.stats.defence + 15000)) * 100).toFixed(1)}%</Text>
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
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  nameLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.textMuted,
    letterSpacing: 2,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 1,
  },
  levelLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
  },
  levelValue: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
    lineHeight: 34,
  },
  rightBlock: {
    alignItems: "flex-end",
    gap: 6,
  },
  goldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  goldIcon: {
    fontSize: 14,
  },
  goldValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
  },
  statPointBadge: {
    backgroundColor: "rgba(160,128,224,0.15)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.game.purple,
  },
  statPointText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.purpleLight,
    letterSpacing: 0.5,
  },
  xpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  xpLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 1,
    width: 18,
  },
  xpTrack: {
    flex: 1,
    height: 5,
    backgroundColor: Colors.game.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    backgroundColor: Colors.game.purple,
    borderRadius: 3,
  },
  xpNumbers: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.game.border,
  },
  statsGrid: {
    flexDirection: "row",
  },
  statCol: {
    flex: 1,
  },
  statSep: {
    width: 1,
    backgroundColor: Colors.game.border,
    marginHorizontal: 12,
  },
  blockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 10,
  },
  blockIcon: {
    fontSize: 14,
  },
  blockLabel: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.textDim,
  },
  blockValue: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.game.blue,
  },
});
