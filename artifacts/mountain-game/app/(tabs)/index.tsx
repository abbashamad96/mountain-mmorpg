import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CharacterPanel } from "@/components/CharacterPanel";
import { EventLog } from "@/components/EventLog";
import { EventNotification } from "@/components/EventNotification";
import { SceneView } from "@/components/SceneView";
import Colors from "@/constants/colors";
import { EventResult, useGame } from "@/context/GameContext";

export default function GameScreen() {
  const { gameState, triggerEvent } = useGame();
  const [isInteracting, setIsInteracting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<EventResult | null>(null);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const handleScenePress = useCallback(() => {
    if (isInteracting) return;

    setIsInteracting(true);
    setIsAnimating(true);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const event = triggerEvent();
    setCurrentEvent(event);

    setTimeout(() => {
      setIsAnimating(false);
    }, 500);

    const cooldown = 2500 + Math.random() * 1500;
    cooldownTimer.current = setTimeout(() => {
      setIsInteracting(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, cooldown);
  }, [isInteracting, triggerEvent]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: Colors.game.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 12, paddingBottom: bottomPad + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.mapLabel}>MAP 01</Text>
          <Text style={styles.mapTitle}>Mountain of Supremacy</Text>
        </View>

        <SceneView
          scene={gameState.currentScene}
          onPress={handleScenePress}
          disabled={isInteracting}
          isAnimating={isAnimating}
        />

        {currentEvent && (
          <View style={styles.notifWrapper}>
            <EventNotification event={currentEvent} />
          </View>
        )}

        <CharacterPanel character={gameState.character} />

        <EventLog events={gameState.eventLog} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {gameState.totalEvents} EVENTS ENCOUNTERED
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 14,
  },
  titleBlock: {
    alignItems: "center",
    marginBottom: 4,
  },
  mapLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 3,
    marginBottom: 2,
  },
  mapTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
    letterSpacing: 0.5,
  },
  notifWrapper: {
    marginTop: -4,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  footerText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textMuted,
    letterSpacing: 2,
  },
});
