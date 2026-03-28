import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { EventResult } from "@/context/GameContext";

interface EventNotificationProps {
  event: EventResult | null;
}

export function EventNotification({ event }: EventNotificationProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const currentId = useRef<string | null>(null);

  useEffect(() => {
    if (!event || event.id === currentId.current) return;
    currentId.current = event.id;

    opacity.setValue(0);
    translateY.setValue(20);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(2500),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [event]);

  if (!event) return null;

  const borderColor =
    event.type === "gain"
      ? Colors.game.green
      : event.type === "loss"
        ? Colors.game.red
        : Colors.game.purple;

  const statLines: string[] = [];
  if (event.statChanges) {
    for (const [key, val] of Object.entries(event.statChanges)) {
      if (val === 0) continue;
      const sign = (val ?? 0) > 0 ? "+" : "";
      statLines.push(`${sign}${val} ${key}`);
    }
  }
  if (event.xpGain) {
    statLines.push(`+${event.xpGain} XP`);
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { borderLeftColor: borderColor, opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.desc}>{event.description}</Text>
      {statLines.length > 0 && (
        <View style={styles.statsRow}>
          {statLines.map((line, i) => (
            <Text
              key={i}
              style={[
                styles.statChip,
                {
                  color:
                    line.startsWith("+") ? Colors.game.green : Colors.game.red,
                },
              ]}
            >
              {line}
            </Text>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.game.text,
    marginBottom: 4,
  },
  desc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  statChip: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
