import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { LogEntry } from "@/context/GameContext";
import { RarityText } from "./RarityText";

interface EventLogProps {
  events: LogEntry[];
}

function LogRow({ entry, first }: { entry: LogEntry; first: boolean }) {
  const time = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={[styles.row, first && styles.rowFirst]}>
      <Text style={styles.time}>{time}</Text>
      <View style={styles.content}>
        {entry.type === "gold_xp" && (
          <Text style={styles.loot}>
            {entry.goldGained > 0 ? `+${entry.goldGained}g ` : ""}
            {entry.xpGained > 0 ? `+${entry.xpGained}xp` : ""}
            {entry.goldGained === 0 && entry.xpGained === 0 ? "No loot" : ""}
          </Text>
        )}
        {entry.type === "gather" && entry.material && (
          <View style={styles.inline}>
            <Text style={styles.typeLabel}>{entry.material.type} </Text>
            <RarityText
              rarity={entry.material.rarity}
              version={entry.material.version}
              style={styles.rarityInline}
            />
          </View>
        )}
        {entry.type === "battle" && (
          <View style={styles.inline}>
            <Text style={[styles.typeLabel, { color: entry.victory ? Colors.game.gold : Colors.game.red }]}>
              {entry.victory ? "⚔ Won · " : "⚔ Fled · "}
            </Text>
            <Text style={styles.loot}>
              {entry.goldGained > 0 ? `+${entry.goldGained}g ` : ""}
              {entry.xpGained > 0 ? `+${entry.xpGained}xp` : ""}
            </Text>
          </View>
        )}
      </View>
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
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {events.map((ev, i) => (
          <LogRow key={ev.id} entry={ev} first={i === 0} />
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
    maxHeight: 220,
  },
  header: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 2, marginBottom: 10,
  },
  scroll: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.game.border,
  },
  rowFirst: { borderTopWidth: 0 },
  time: {
    fontSize: 10, fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted, paddingTop: 1, width: 38,
  },
  content: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 4, alignItems: "center" },
  inline: { flexDirection: "row", alignItems: "center" },
  loot: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.game.purple },
  typeLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.game.textDim },
  rarityInline: { fontSize: 12, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", padding: 14 },
  emptyText: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted, fontStyle: "italic", textAlign: "center",
  },
});
