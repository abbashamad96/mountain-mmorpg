import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { EventResult } from "@/context/GameContext";

interface EventLogProps {
  events: EventResult[];
}

const TYPE_COLOR: Record<EventResult["type"], string> = {
  gain: Colors.game.green,
  loss: Colors.game.red,
  neutral: Colors.game.purple,
  level: Colors.game.gold,
};

const TYPE_ICON: Record<EventResult["type"], string> = {
  gain: "▲",
  loss: "▼",
  neutral: "◆",
  level: "★",
};

export function EventLog({ events }: EventLogProps) {
  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Tap the scene to begin your journey...
        </Text>
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
          <View
            key={ev.id}
            style={[styles.entry, i === 0 && styles.entryFirst]}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: TYPE_COLOR[ev.type] },
              ]}
            />
            <View style={styles.entryContent}>
              <Text style={styles.entryTitle}>{ev.title}</Text>
              <Text style={styles.entryDesc} numberOfLines={2}>
                {ev.description}
              </Text>
            </View>
            <Text
              style={[styles.typeIcon, { color: TYPE_COLOR[ev.type] }]}
            >
              {TYPE_ICON[ev.type]}
            </Text>
          </View>
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
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 2,
    marginBottom: 10,
  },
  scroll: {
    flex: 1,
  },
  empty: {
    alignItems: "center",
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted,
    textAlign: "center",
    fontStyle: "italic",
  },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.game.border,
    gap: 10,
  },
  entryFirst: {
    borderTopWidth: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  entryContent: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.text,
  },
  entryDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    marginTop: 1,
  },
  typeIcon: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
});
