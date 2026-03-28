import { Feather } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BattleModal } from "@/components/BattleModal";
import { ChatModal } from "@/components/ChatModal";
import { EventNotification } from "@/components/EventNotification";
import { GatheringModal } from "@/components/GatheringModal";
import { SceneView } from "@/components/SceneView";
import { StatsModal } from "@/components/StatsModal";
import { TimerBar } from "@/components/TimerBar";
import Colors from "@/constants/colors";
import {
  EventRoll,
  LogEntry,
  Material,
  NpcBattleStats,
  rollEvent,
  useGame,
} from "@/context/GameContext";

export default function GameScreen() {
  const { gameState, setScene, applyGoldXp, addMaterials, addLogEntry, incrementEvents } = useGame();

  const [isInteracting, setIsInteracting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [cooldownDuration, setCooldownDuration] = useState(2500);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lastRoll, setLastRoll] = useState<EventRoll | null>(null);

  const [artIndex, setArtIndex] = useState(0);
  const artTriggerRef = useRef(0);
  const artThresholdRef = useRef(Math.floor(10 + Math.random() * 11));

  const [showStats, setShowStats] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [gatherMaterial, setGatherMaterial] = useState<Material | null>(null);
  const [gatherAttempts, setGatherAttempts] = useState(1);
  const [showGather, setShowGather] = useState(false);
  const [battleNpc, setBattleNpc] = useState<NpcBattleStats | null>(null);
  const [showBattle, setShowBattle] = useState(false);

  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const char = gameState.character;

  const handleScenePress = useCallback(() => {
    if (isInteracting) return;

    const duration = Math.floor(2500 + Math.random() * 1500);
    setCooldownDuration(duration);
    setIsInteracting(true);
    setIsAnimating(true);

    const roll = rollEvent(char);
    setScene(roll.sceneType);
    incrementEvents();

    // Advance background art every 10-20 triggers
    artTriggerRef.current += 1;
    if (artTriggerRef.current >= artThresholdRef.current) {
      artTriggerRef.current = 0;
      artThresholdRef.current = Math.floor(10 + Math.random() * 11);
      setArtIndex((prev) => prev + 1);
    }

    setTimeout(() => setIsAnimating(false), 500);

    if (roll.type === "gold_xp") {
      const result = applyGoldXp(roll.goldGained, roll.xpGained);
      const finalRoll: EventRoll = {
        ...roll,
        levelsAfter: result.updatedChar.level,
        statPointsGained: result.statPointsGained,
      };
      setLastRoll(finalRoll);

      const entry: LogEntry = {
        id: roll.id,
        timestamp: roll.timestamp,
        type: "gold_xp",
        summary: `+${roll.goldGained}g +${roll.xpGained}xp`,
        goldGained: roll.goldGained,
        xpGained: roll.xpGained,
        material: null,
      };
      addLogEntry(entry);

      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
      cooldownTimer.current = setTimeout(() => {
        setIsInteracting(false);
      }, duration);
    } else if (roll.type === "gather" && roll.material) {
      setLastRoll(roll);
      setGatherMaterial(roll.material);
      setGatherAttempts(roll.gatherAttempts);
      setShowGather(true);
    } else if (roll.type === "battle" && roll.npc) {
      setLastRoll(roll);
      setBattleNpc(roll.npc);
      setShowBattle(true);
    }
  }, [isInteracting, char, applyGoldXp, addMaterials, addLogEntry, incrementEvents, setScene]);

  const handleGatherComplete = useCallback(
    (gathered: Material[]) => {
      setShowGather(false);
      if (gathered.length > 0) {
        addMaterials(gathered);
        const mat = gathered[0];
        const entry: LogEntry = {
          id: `g-${Date.now()}`,
          timestamp: Date.now(),
          type: "gather",
          summary: `Gathered ${mat.type} ×${gathered.length}`,
          goldGained: 0,
          xpGained: 0,
          material: mat,
        };
        addLogEntry(entry);
      }
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
      cooldownTimer.current = setTimeout(() => {
        setIsInteracting(false);
      }, 500);
    },
    [addMaterials, addLogEntry, cooldownDuration]
  );

  const handleBattleComplete = useCallback(
    (victory: boolean, goldReward: number, xpReward: number) => {
      setShowBattle(false);
      if (victory && (goldReward > 0 || xpReward > 0)) {
        applyGoldXp(goldReward, xpReward);
      }
      const npc = battleNpc;
      if (npc) {
        const entry: LogEntry = {
          id: `b-${Date.now()}`,
          timestamp: Date.now(),
          type: "battle",
          summary: victory
            ? `Defeated ${npc.name} +${goldReward}g +${xpReward}xp`
            : `Fled from ${npc.name}`,
          goldGained: goldReward,
          xpGained: xpReward,
          material: null,
          victory,
        };
        addLogEntry(entry);
      }
      cooldownTimer.current = setTimeout(() => {
        setIsInteracting(false);
      }, 500);
    },
    [battleNpc, applyGoldXp, addLogEntry]
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 12, paddingBottom: bottomPad + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.mapLabel}>MAP 01</Text>
            <Text style={styles.mapTitle}>Mountain of Supremacy</Text>
          </View>
          <View style={styles.headerBtns}>
            <Pressable
              style={styles.headerBtn}
              onPress={() => setShowChat(true)}
              hitSlop={4}
            >
              <Feather name="message-circle" size={20} color={Colors.game.blue} />
            </Pressable>
            <Pressable style={styles.headerBtn} onPress={() => setShowStats(true)} hitSlop={4}>
              <Feather name="user" size={20} color={Colors.game.gold} />
              {char.pendingStatPoints > 0 && (
                <View style={styles.statsBadge}>
                  <Text style={styles.statsBadgeText}>{char.pendingStatPoints}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Quick gold + level strip */}
        <View style={styles.quickStrip}>
          <View style={styles.stripItem}>
            <View style={styles.goldCoin}>
              <Text style={styles.goldCoinText}>G</Text>
            </View>
            <Text style={styles.stripValue}>{char.gold.toLocaleString()}</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripLabel}>LV</Text>
            <Text style={styles.stripValue}>{char.level}</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItemXp}>
            <View style={styles.xpTrack}>
              <View
                style={[
                  styles.xpFill,
                  { width: `${Math.min(100, (char.xp / char.xpToNext) * 100)}%` as any },
                ]}
              />
            </View>
            <Text style={styles.xpText}>{char.xp}/{char.xpToNext} XP</Text>
          </View>
        </View>

        {/* Scene */}
        <SceneView
          scene={gameState.currentScene}
          artIndex={artIndex}
          onPress={handleScenePress}
          disabled={isInteracting}
          isAnimating={isAnimating}
        />

        {/* Timer bar */}
        <TimerBar isActive={isInteracting} duration={cooldownDuration} />

        {/* Event notification */}
        {lastRoll && <EventNotification roll={lastRoll} />}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {gameState.totalEvents} EVENTS ENCOUNTERED
          </Text>
        </View>
      </ScrollView>

      {/* Modals */}
      <ChatModal visible={showChat} onClose={() => setShowChat(false)} />
      <StatsModal visible={showStats} onClose={() => setShowStats(false)} />
      <GatheringModal
        visible={showGather}
        material={gatherMaterial}
        totalAttempts={gatherAttempts}
        onComplete={handleGatherComplete}
      />
      <BattleModal
        visible={showBattle}
        npc={battleNpc}
        playerStats={char.stats}
        playerLevel={char.level}
        onComplete={handleBattleComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.game.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleBlock: {},
  mapLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 3, marginBottom: 1,
  },
  mapTitle: {
    fontSize: 20, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 0.5,
  },
  headerBtns: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  headerBtn: {
    padding: 10,
    backgroundColor: Colors.game.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.game.border,
    position: "relative",
  },
  statsBadge: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: Colors.game.purple,
    borderRadius: 8, width: 16, height: 16,
    alignItems: "center", justifyContent: "center",
  },
  statsBadgeText: {
    fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff",
  },
  quickStrip: {
    flexDirection: "row",
    backgroundColor: Colors.game.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.game.border,
    gap: 10,
  },
  stripItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  stripItemXp: { flex: 1, gap: 3 },
  goldCoin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.game.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#a07820",
  },
  goldCoinText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#3d2e00",
  },
  stripLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 1,
  },
  stripValue: {
    fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.game.gold,
  },
  stripDivider: {
    width: 1, height: 20, backgroundColor: Colors.game.border,
  },
  xpTrack: {
    height: 4, backgroundColor: Colors.game.border,
    borderRadius: 2, overflow: "hidden",
  },
  xpFill: { height: "100%", backgroundColor: Colors.game.purple, borderRadius: 2 },
  xpText: {
    fontSize: 9, fontFamily: "Inter_500Medium", color: Colors.game.textMuted,
  },
  footer: { alignItems: "center", paddingVertical: 8 },
  footerText: {
    fontSize: 10, fontFamily: "Inter_500Medium",
    color: Colors.game.textMuted, letterSpacing: 2,
  },
});
