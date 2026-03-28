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
import { StatAllocModal } from "@/components/StatAllocModal";
import { TimerBar } from "@/components/TimerBar";
import Colors from "@/constants/colors";
import { EventOutcome, useGame } from "@/context/GameContext";

export default function GameScreen() {
  const { gameState, triggerEvent, lastOutcome } = useGame();
  const [isInteracting, setIsInteracting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [cooldownDuration, setCooldownDuration] = useState(2500);
  const [currentOutcome, setCurrentOutcome] = useState<EventOutcome | null>(null);
  const [showAllocModal, setShowAllocModal] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleScenePress = useCallback(() => {
    if (isInteracting) return;

    const duration = Math.floor(2500 + Math.random() * 1500);
    setCooldownDuration(duration);
    setIsInteracting(true);
    setIsAnimating(true);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const outcome = triggerEvent();
    setCurrentOutcome(outcome);

    setTimeout(() => setIsAnimating(false), 500);

    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    cooldownTimer.current = setTimeout(() => {
      setIsInteracting(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if (outcome.statPointsGained > 0) {
        setTimeout(() => setShowAllocModal(true), 400);
      }
    }, duration);
  }, [isInteracting, triggerEvent]);

  const char = gameState.character;
  const hasPending = char.pendingStatPoints > 0;

  return (
    <View style={[styles.root]}>
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

        <TimerBar isActive={isInteracting} duration={cooldownDuration} />

        {currentOutcome && (
          <EventNotification outcome={currentOutcome} />
        )}

        <CharacterPanel
          character={char}
          onStatAllocPress={() => setShowAllocModal(true)}
        />

        <EventLog events={gameState.eventLog} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {gameState.totalEvents} EVENTS ENCOUNTERED
          </Text>
        </View>
      </ScrollView>

      <StatAllocModal
        visible={showAllocModal && hasPending}
        onClose={() => setShowAllocModal(false)}
        pendingPoints={char.pendingStatPoints}
        stats={char.stats}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.game.background,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    gap: 12,
  },
  titleBlock: {
    alignItems: "center",
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
