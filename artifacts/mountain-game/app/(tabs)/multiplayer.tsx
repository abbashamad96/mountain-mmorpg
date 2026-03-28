import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BattleModal } from "@/components/BattleModal";
import { ChallengeModal } from "@/components/ChallengeModal";
import { SceneView } from "@/components/SceneView";
import Colors from "@/constants/colors";
import { EventResult, useGame } from "@/context/GameContext";
import { useMultiplayer } from "@/context/MultiplayerContext";

export default function MultiplayerScreen() {
  const { gameState, triggerEvent } = useGame();
  const {
    status,
    roomCode,
    yourId,
    players,
    playerName,
    setPlayerName,
    joinRoom,
    leaveRoom,
    broadcastCoOpEvent,
    challengePlayer,
    acceptBattle,
    declineBattle,
    syncStats,
    incomingChallenge,
    clearIncomingChallenge,
    lastBattleResult,
    clearBattleResult,
    lastCoOpEvent,
    clearCoOpEvent,
    coOpLog,
  } = useMultiplayer();

  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [nameInput, setNameInput] = useState(playerName);
  const [codeInput, setCodeInput] = useState("");
  const [isInteracting, setIsInteracting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [challengedId, setChallengedId] = useState<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isConnected = status === "connected" && !!roomCode;

  const handleJoin = useCallback(() => {
    const trimCode = codeInput.trim().toUpperCase() || null;
    setPlayerName(nameInput.trim() || "Wanderer");
    joinRoom(trimCode, gameState.character.level, gameState.character.stats);
  }, [codeInput, nameInput, gameState, joinRoom, setPlayerName]);

  const handleScenePress = useCallback(() => {
    if (isInteracting) return;
    setIsInteracting(true);
    setIsAnimating(true);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const event = triggerEvent();
    broadcastCoOpEvent(event);
    syncStats(gameState.character.level, gameState.character.stats);

    setTimeout(() => setIsAnimating(false), 500);

    const cd = 2500 + Math.random() * 1500;
    cooldownRef.current = setTimeout(() => {
      setIsInteracting(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, cd);
  }, [isInteracting, triggerEvent, broadcastCoOpEvent, syncStats, gameState]);

  const handleChallenge = useCallback(
    (targetId: string) => {
      setChallengedId(targetId);
      challengePlayer(targetId);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    },
    [challengePlayer]
  );

  if (!isConnected) {
    return (
      <View
        style={[
          styles.root,
          { paddingTop: topPad + 12, paddingBottom: bottomPad + 90 },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.lobbyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleBlock}>
            <Text style={styles.mapLabel}>MULTIPLAYER</Text>
            <Text style={styles.mapTitle}>Co-op & PvP</Text>
            <Text style={styles.mapSubtitle}>
              Join a room to explore together or battle other wanderers
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formLabel}>YOUR NAME</Text>
            <TextInput
              style={styles.input}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter name..."
              placeholderTextColor={Colors.game.textMuted}
              maxLength={16}
              autoCapitalize="words"
            />

            <Text style={[styles.formLabel, { marginTop: 16 }]}>
              ROOM CODE (leave blank to create)
            </Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={codeInput}
              onChangeText={(t) => setCodeInput(t.toUpperCase())}
              placeholder="e.g. ABCD"
              placeholderTextColor={Colors.game.textMuted}
              maxLength={4}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Pressable
              style={[
                styles.joinBtn,
                status === "connecting" && styles.joinBtnDisabled,
              ]}
              onPress={handleJoin}
              disabled={status === "connecting"}
            >
              <Text style={styles.joinBtnText}>
                {status === "connecting"
                  ? "CONNECTING..."
                  : codeInput.trim().length === 4
                    ? "JOIN ROOM"
                    : "CREATE ROOM"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoLine}>
              🗺 Co-op: everyone explores together — events are shared
            </Text>
            <Text style={styles.infoLine}>
              ⚔ PvP: challenge players in your room to a stat battle
            </Text>
            <Text style={styles.infoLine}>
              🔗 Share your room code with friends to play together
            </Text>
          </View>
        </ScrollView>

        <ChallengeModal
          challenge={incomingChallenge}
          onAccept={() => {
            if (incomingChallenge) acceptBattle(incomingChallenge.fromId);
          }}
          onDecline={() => {
            if (incomingChallenge) declineBattle(incomingChallenge.fromId);
          }}
        />
        <BattleModal result={lastBattleResult} onClose={clearBattleResult} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.roomContent,
          { paddingTop: topPad + 12, paddingBottom: bottomPad + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.roomHeader}>
          <View>
            <Text style={styles.mapLabel}>ROOM CODE</Text>
            <Text style={styles.roomCode}>{roomCode}</Text>
          </View>
          <View style={styles.roomHeaderRight}>
            <Text style={styles.playerCountText}>
              {players.length + 1} player{players.length !== 0 ? "s" : ""}
            </Text>
            <Pressable style={styles.leaveBtn} onPress={leaveRoom}>
              <Text style={styles.leaveBtnText}>Leave</Text>
            </Pressable>
          </View>
        </View>

        <SceneView
          scene={gameState.currentScene}
          onPress={handleScenePress}
          disabled={isInteracting}
          isAnimating={isAnimating}
        />

        {lastCoOpEvent && (
          <View style={styles.coOpBanner}>
            <Text style={styles.coOpBannerText}>
              <Text style={styles.coOpName}>{lastCoOpEvent.triggeredBy}</Text>
              {" triggered: "}
              <Text style={styles.coOpEventName}>
                {lastCoOpEvent.event.title}
              </Text>
            </Text>
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>PLAYERS IN ROOM</Text>
          {players.length === 0 ? (
            <Text style={styles.emptyText}>
              Waiting for others... Share the room code!
            </Text>
          ) : (
            players.map((p) => (
              <View key={p.id} style={styles.playerRow}>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{p.name}</Text>
                  <Text style={styles.playerLevel}>Lv.{p.level}</Text>
                </View>
                <View style={styles.playerMiniStats}>
                  <Text style={styles.miniStat}>
                    <Text style={{ color: Colors.game.red }}>⚔</Text> {p.stats.strength}
                  </Text>
                  <Text style={styles.miniStat}>
                    <Text style={{ color: Colors.game.green }}>♥</Text> {p.stats.health}
                  </Text>
                  <Text style={styles.miniStat}>
                    <Text style={{ color: Colors.game.blue }}>🛡</Text> {p.stats.defence}
                  </Text>
                </View>
                <Pressable
                  style={[
                    styles.challengeBtn,
                    challengedId === p.id && styles.challengeBtnPending,
                  ]}
                  onPress={() => handleChallenge(p.id)}
                  disabled={challengedId === p.id}
                >
                  <Text style={styles.challengeBtnText}>
                    {challengedId === p.id ? "..." : "⚔"}
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        {coOpLog.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>CO-OP EVENT LOG</Text>
            {coOpLog.slice(0, 8).map((e, i) => (
              <View key={i} style={styles.coOpLogRow}>
                <View style={styles.coOpLogDot} />
                <View style={styles.coOpLogContent}>
                  <Text style={styles.coOpLogWho}>{e.triggeredBy}</Text>
                  <Text style={styles.coOpLogEvent}>{e.event.title}</Text>
                </View>
                <Text
                  style={[
                    styles.coOpLogType,
                    {
                      color:
                        e.event.type === "gain"
                          ? Colors.game.green
                          : e.event.type === "loss"
                            ? Colors.game.red
                            : Colors.game.purple,
                    },
                  ]}
                >
                  {e.event.type === "gain"
                    ? "▲"
                    : e.event.type === "loss"
                      ? "▼"
                      : "◆"}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <ChallengeModal
        challenge={incomingChallenge}
        onAccept={() => {
          if (incomingChallenge) acceptBattle(incomingChallenge.fromId);
        }}
        onDecline={() => {
          if (incomingChallenge) declineBattle(incomingChallenge.fromId);
        }}
      />
      <BattleModal result={lastBattleResult} onClose={() => {
        clearBattleResult();
        setChallengedId(null);
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.game.background,
  },
  lobbyContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  roomContent: {
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
    textAlign: "center",
  },
  mapTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
    letterSpacing: 0.5,
  },
  mapSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    textAlign: "center",
    marginTop: 6,
  },
  formCard: {
    backgroundColor: Colors.game.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  formLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.game.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.game.text,
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  codeInput: {
    letterSpacing: 8,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  joinBtn: {
    backgroundColor: Colors.game.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  joinBtnDisabled: {
    opacity: 0.6,
  },
  joinBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.game.background,
    letterSpacing: 1,
  },
  infoCard: {
    backgroundColor: Colors.game.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.game.border,
    gap: 8,
  },
  infoTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.textDim,
    marginBottom: 4,
  },
  infoLine: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted,
    lineHeight: 20,
  },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  roomCode: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
    letterSpacing: 8,
  },
  roomHeaderRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  playerCountText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  leaveBtn: {
    backgroundColor: Colors.game.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  leaveBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.textDim,
  },
  coOpBanner: {
    backgroundColor: Colors.game.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.game.purple,
    borderLeftWidth: 3,
    borderLeftColor: Colors.game.purple,
  },
  coOpBannerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
  },
  coOpName: {
    color: Colors.game.purpleLight,
    fontFamily: "Inter_600SemiBold",
  },
  coOpEventName: {
    color: Colors.game.text,
    fontFamily: "Inter_600SemiBold",
  },
  sectionCard: {
    backgroundColor: Colors.game.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 2,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.game.border,
    gap: 8,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.text,
  },
  playerLevel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.game.gold,
    marginTop: 1,
  },
  playerMiniStats: {
    flexDirection: "row",
    gap: 8,
  },
  miniStat: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  challengeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(201,168,76,0.15)",
    borderWidth: 1,
    borderColor: Colors.game.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  challengeBtnPending: {
    opacity: 0.5,
    borderColor: Colors.game.textMuted,
  },
  challengeBtnText: {
    fontSize: 14,
    color: Colors.game.gold,
  },
  coOpLogRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.game.border,
    gap: 10,
  },
  coOpLogDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.game.purple,
    flexShrink: 0,
  },
  coOpLogContent: {
    flex: 1,
  },
  coOpLogWho: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.purpleLight,
  },
  coOpLogEvent: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
  },
  coOpLogType: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
});
