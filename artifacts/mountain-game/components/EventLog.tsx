import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { EventOutcome, RARITY_COLORS } from "@/context/GameContext";
import { RarityText } from "./RarityText";

interface EventLogProps {
  events: EventOutcome[];
}

function EventLogRow({ ev, first }: { ev: EventOutcome; first: boolean }) {
  const parts: React.ReactNode[] = [];
  const time = new Date(ev.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (ev.levelsAfter > ev.levelsBefore) {
    parts.push(
      <Text key="lv" style={styles.levelUp}>
        ★ Lv {ev.levelsAfter}
      </Text>
    );
  }

  if (ev.goldGained > 0 || ev.xpGained > 0) {
    parts.push(
      <Text key="loot" style={styles.loot}>
        {ev.goldGained > 0 ? `+${ev.goldGained}g ` : ""}
        {ev.xpGained > 0 ? `+${ev.xpGained}xp` : ""}
      </Text>
    );
  }

  if (ev.gathered) {
    const g = ev.gathered;
    parts.push(
      <View key="gather" style={styles.inlineRow}>
        <Text style={styles.gatherType}>{g.type} </Text>
        <RarityText
          rarity={g.rarity}
          version={g.version}
          style={styles.rarityInline}
        />
      </View>
    );
  }

  if (ev.npc) {
    parts.push(
      <View key="npc" style={styles.inlineRow}>
        <Text style={styles.npcLabel}>⚔ </Text>
        <RarityText
          rarity={ev.npc.rarity}
          version={ev.npc.version}
          label={`${ev.npc.rarity} Enemy`}
          style={styles.rarityInline}
        />
      </View>
    );
  }

  if (parts.length === 0) {
    parts.push(
      <Text key="none" style={styles.noneText}>No effect</Text>
    );
  }

  return (
    <View style={[styles.row, first && styles.rowFirst]}>
      <Text style={styles.time}>{time}</Text>
      <View style={styles.partsWrap}>{parts}</View>
    </View>
  );
}

export function EventLog({ events }: EventLogProps) {
  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Tap the road to begin your journey...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>EVENT LOG</Text>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {events.map((ev, i) => (
          <EventLogRow key={ev.id} ev={ev} first={i === 0} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.game.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.game.border,
    maxHeight: 230,
  },
  header: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 2,
    marginBottom: 10,
  },
  scroll: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: Colors.game.border,
  },
  rowFirst: { borderTopWidth: 0 },
  time: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted,
    paddingTop: 1,
    width: 38,
  },
  partsWrap: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  levelUp: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
  },
  loot: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.purple,
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gatherType: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  rarityInline: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  npcLabel: {
    fontSize: 12,
    color: Colors.game.textDim,
  },
  noneText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted,
    fontStyle: "italic",
  },
  empty: {
    alignItems: "center",
    padding: 14,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted,
    fontStyle: "italic",
    textAlign: "center",
  },
});
