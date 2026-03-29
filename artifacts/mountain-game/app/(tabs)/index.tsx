import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuctionHouseModal } from "@/components/AuctionHouseModal";
import { AuthModal } from "@/components/AuthModal";
import { BattleModal } from "@/components/BattleModal";
import { ChatModal } from "@/components/ChatModal";
import { GatheringModal } from "@/components/GatheringModal";
import { SceneView } from "@/components/SceneView";
import { StatsModal } from "@/components/StatsModal";
import { TimerBar } from "@/components/TimerBar";
import Colors from "@/constants/colors";
import {
  LogEntry,
  Material,
  RARITY_COLORS,
  MaterialEntry,
  NpcBattleStats,
  rollEvent,
  rollNpcDrop,
  useGame,
} from "@/context/GameContext";
import { useMultiplayer } from "@/context/MultiplayerContext";

// ─── AH toast banner ──────────────────────────────────────────────────────────

type AhToastData = { id: string; msg: string; isGold: boolean };

function AhToast({ toast }: { toast: AhToastData }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2700),
      Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[toastStyles.toast, { opacity: fade }]}>
      <Feather
        name={toast.isGold ? "dollar-sign" : "package"}
        size={11}
        color={toast.isGold ? Colors.game.gold : Colors.game.blue}
      />
      <Text style={toastStyles.toastTxt}>{toast.msg}</Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  toast: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "rgba(18,18,24,0.92)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.game.border,
    alignSelf: "flex-start",
  },
  toastTxt: {
    fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.game.text,
    flexShrink: 1,
  },
});

// ─── Event log stack (above scene image) ─────────────────────────────────────

const MAX_LOG_VISIBLE = 4;

const TIER_COLORS: Record<number, string> = {
  1: "#A78BFA",
  2: "#34D399",
  3: "#FCD34D",
};

function LogEntryRow({ entry }: { entry: LogEntry }) {
  const mat = entry.material;
  const isVictory = entry.victory === true;

  // Extract NPC name from summary for battle entries
  let npcName = "";
  if (entry.type === "battle") {
    const m = isVictory
      ? entry.summary.match(/^Defeated (.+?) \+/)
      : entry.summary.match(/^Fled from (.+)$/);
    npcName = m ? m[1] : "";
  }

  return (
    <View style={logStackStyles.row}>
      {/* Left icon */}
      <View style={logStackStyles.iconWrap}>
        {entry.type === "gold_xp" && (
          <View style={logStackStyles.gCoin}>
            <Text style={logStackStyles.gCoinTxt}>G</Text>
          </View>
        )}
        {entry.type === "gather" && (
          <Text style={logStackStyles.emoji}>📦</Text>
        )}
        {entry.type === "battle" && (
          <Text style={logStackStyles.emoji}>{isVictory ? "⚔" : "🏃"}</Text>
        )}
      </View>

      {/* Content */}
      <View style={logStackStyles.content}>
        {/* Gold / XP event */}
        {entry.type === "gold_xp" && (
          <View style={logStackStyles.inlineRow}>
            {entry.goldGained > 0 && (
              <Text style={logStackStyles.gold}>+{entry.goldGained}g</Text>
            )}
            {entry.xpGained > 0 && (
              <Text style={logStackStyles.xp}>+{entry.xpGained} xp</Text>
            )}
          </View>
        )}

        {/* Gather event */}
        {entry.type === "gather" && mat && (() => {
          const countMatch = entry.summary.match(/×(\d+)/);
          const count = countMatch ? parseInt(countMatch[1]) : 1;
          return (
            <View style={logStackStyles.battleBlock}>
              <View style={logStackStyles.inlineRow}>
                <Text style={logStackStyles.dimLabel}>Gathered</Text>
                <Text style={[logStackStyles.matName, { color: RARITY_COLORS[mat.rarity] ?? Colors.game.text }]}>
                  {mat.type}
                </Text>
                {mat.version > 0 && (
                  <View style={[logStackStyles.tierBadge, { borderColor: TIER_COLORS[mat.version] ?? Colors.game.border }]}>
                    <Text style={[logStackStyles.tierTxt, { color: TIER_COLORS[mat.version] ?? Colors.game.text }]}>
                      T{mat.version}
                    </Text>
                  </View>
                )}
                <Text style={[logStackStyles.rarityLabel, { color: RARITY_COLORS[mat.rarity] ?? Colors.game.text }]}>
                  {mat.rarity}
                </Text>
                {count > 1 && <Text style={logStackStyles.dimLabel}>×{count}</Text>}
              </View>
              {entry.xpGained > 0 && (
                <View style={logStackStyles.inlineRow}>
                  <Text style={logStackStyles.xp}>+{entry.xpGained} xp</Text>
                </View>
              )}
            </View>
          );
        })()}

        {/* Battle event */}
        {entry.type === "battle" && (
          <View style={logStackStyles.battleBlock}>
            <View style={logStackStyles.inlineRow}>
              <Text style={logStackStyles.dimLabel}>{isVictory ? "Defeated" : "Fled from"}</Text>
              <Text style={logStackStyles.npcName} numberOfLines={1}>{npcName}</Text>
            </View>
            {isVictory && (entry.goldGained > 0 || entry.xpGained > 0) && (
              <View style={logStackStyles.inlineRow}>
                {entry.goldGained > 0 && (
                  <Text style={logStackStyles.gold}>+{entry.goldGained}g</Text>
                )}
                {entry.xpGained > 0 && (
                  <Text style={logStackStyles.xp}>+{entry.xpGained} xp</Text>
                )}
              </View>
            )}
            {mat && (
              <View style={logStackStyles.inlineRow}>
                <Text style={logStackStyles.dimLabel}>drop:</Text>
                <Text style={[logStackStyles.matName, { color: RARITY_COLORS[mat.rarity] ?? Colors.game.text }]}>
                  {mat.type}
                </Text>
                {mat.version > 0 && (
                  <View style={[logStackStyles.tierBadge, { borderColor: TIER_COLORS[mat.version] ?? Colors.game.border }]}>
                    <Text style={[logStackStyles.tierTxt, { color: TIER_COLORS[mat.version] ?? Colors.game.text }]}>
                      T{mat.version}
                    </Text>
                  </View>
                )}
                <Text style={[logStackStyles.rarityLabel, { color: RARITY_COLORS[mat.rarity] ?? Colors.game.text }]}>
                  {mat.rarity}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function EventLogStack({ logs }: { logs: LogEntry[] }) {
  // eventLog is stored newest-first; take the most recent N then reverse for oldest-top display
  const recent = logs.slice(0, MAX_LOG_VISIBLE).reverse();
  const animMapRef = useRef<Map<string, Animated.Value>>(new Map());
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const map = animMapRef.current;
    let changed = false;
    for (const entry of recent) {
      if (!map.has(entry.id)) {
        const anim = new Animated.Value(0);
        map.set(entry.id, anim);
        Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        changed = true;
      }
    }
    for (const key of Array.from(map.keys())) {
      if (!recent.find((e) => e.id === key)) {
        map.delete(key);
        changed = true;
      }
    }
    if (changed) forceUpdate((n) => n + 1);
  }, [logs]);

  if (recent.length === 0) return null;
  const map = animMapRef.current;

  return (
    <View style={logStackStyles.container}>
      {recent.map((entry) => {
        const anim = map.get(entry.id);
        if (!anim) return null;
        const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
        return (
          <Animated.View
            key={entry.id}
            style={{ opacity: anim, transform: [{ translateY }] }}
          >
            <LogEntryRow entry={entry} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const logStackStyles = StyleSheet.create({
  container: { gap: 5 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(10,7,18,0.88)",
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.5)",
  },
  iconWrap: {
    width: 22,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 1,
  },
  gCoin: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.game.gold,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#a07820",
  },
  gCoinTxt: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#3d2e00" },
  emoji: { fontSize: 14 },
  content: { flex: 1, gap: 3 },
  battleBlock: { gap: 3 },
  inlineRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5 },
  dimLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
  matName: { fontSize: 12, fontFamily: "Inter_700Bold" },
  rarityLabel: { fontSize: 11, fontFamily: "Inter_500Medium", opacity: 0.85 },
  npcName: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.game.text },
  gold: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  xp: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.game.purpleLight },
  tierBadge: {
    borderWidth: 1, borderRadius: 5,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  tierTxt: { fontSize: 10, fontFamily: "Inter_700Bold" },
});

export default function GameScreen() {
  const {
    gameState, setScene, applyGoldXp, addMaterials, addLogEntry,
    incrementEvents, loadState,
  } = useGame();
  const {
    ahEvents, consumeAhEvent,
    isAuthenticated, authUsername, serverGameState, clearServerGameState,
    saveGameState,
  } = useMultiplayer();

  const [isInteracting, setIsInteracting] = useState(false);
  const [cooldownDuration, setCooldownDuration] = useState(2500);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);


  const gatherXpRef = useRef(0);

  const [artIndex, setArtIndex] = useState(0);
  const artTriggerRef = useRef(0);
  const artThresholdRef = useRef(Math.floor(10 + Math.random() * 11));

  const [showStats, setShowStats] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showAuction, setShowAuction] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [gatherMaterial, setGatherMaterial] = useState<Material | null>(null);
  const [gatherAttempts, setGatherAttempts] = useState(1);
  const [showGather, setShowGather] = useState(false);
  const [battleNpc, setBattleNpc] = useState<NpcBattleStats | null>(null);
  const [showBattle, setShowBattle] = useState(false);
  const [preSelectForAh, setPreSelectForAh] = useState<MaterialEntry | null>(null);
  const [ahToasts, setAhToasts] = useState<AhToastData[]>([]);

  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const char = gameState.character;

  // ── Load server state on login ────────────────────────────────────────────
  useEffect(() => {
    if (serverGameState) {
      loadState(serverGameState as any);
      clearServerGameState();
    }
  }, [serverGameState, loadState, clearServerGameState]);

  // ── Auto-save game state when authenticated ───────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveGameState(gameState);
    }, 5000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [gameState, isAuthenticated, saveGameState]);

  // ── AH toast helper ───────────────────────────────────────────────────────
  const pushToast = useCallback((msg: string, isGold: boolean) => {
    const id = `t-${Date.now()}-${Math.random()}`;
    setAhToasts((prev) => [...prev, { id, msg, isGold }]);
    setTimeout(() => setAhToasts((prev) => prev.filter((t) => t.id !== id)), 3600);
  }, []);

  // ── Process AH + buy order events ────────────────────────────────────────
  useEffect(() => {
    for (const ev of ahEvents) {
      if (ev.kind === "sale") {
        applyGoldXp(ev.listing!.price, 0);
        pushToast(`Listing sold! +${ev.listing!.price.toLocaleString()}G`, true);
        consumeAhEvent(ev.id);
      } else if (ev.kind === "bought") {
        addMaterials(Array(ev.listing!.count).fill(ev.listing!.material));
        pushToast(`Received ×${ev.listing!.count} ${ev.listing!.material.rarity} ${ev.listing!.material.type}`, false);
        consumeAhEvent(ev.id);
      } else if (ev.kind === "cancelled") {
        addMaterials(Array(ev.listing!.count).fill(ev.listing!.material));
        consumeAhEvent(ev.id);
      } else if (ev.kind === "bo_sold") {
        if (ev.boGoldEarned && ev.boGoldEarned > 0) {
          applyGoldXp(ev.boGoldEarned, 0);
          pushToast(`Buy order filled! +${ev.boGoldEarned.toLocaleString()}G`, true);
        }
        consumeAhEvent(ev.id);
      } else if (ev.kind === "bo_received") {
        if (ev.boMaterial && ev.boCount && ev.boCount > 0) {
          addMaterials(Array(ev.boCount).fill(ev.boMaterial));
          pushToast(`Received ×${ev.boCount} ${ev.boMaterial.rarity} ${ev.boMaterial.type} from order`, false);
        }
        consumeAhEvent(ev.id);
      } else if (ev.kind === "bo_cancelled") {
        if (ev.boGoldReturn && ev.boGoldReturn > 0) {
          applyGoldXp(ev.boGoldReturn, 0);
          pushToast(`Order cancelled — +${ev.boGoldReturn.toLocaleString()}G refunded`, true);
        }
        consumeAhEvent(ev.id);
      }
    }
  }, [ahEvents, applyGoldXp, addMaterials, consumeAhEvent, pushToast]);

  // ── Scene exploration ─────────────────────────────────────────────────────
  const handleScenePress = useCallback(() => {
    if (isInteracting) return;

    const duration = Math.floor(2500 + Math.random() * 1500);
    setCooldownDuration(duration);
    setIsInteracting(true);

    const roll = rollEvent(char);
    setScene(roll.sceneType);
    incrementEvents();

    artTriggerRef.current += 1;
    if (artTriggerRef.current >= artThresholdRef.current) {
      artTriggerRef.current = 0;
      artThresholdRef.current = Math.floor(10 + Math.random() * 11);
      setArtIndex((prev) => prev + 1);
    }

    if (roll.type === "gold_xp") {
      applyGoldXp(roll.goldGained, roll.xpGained);
      addLogEntry({
        id: roll.id,
        timestamp: roll.timestamp,
        type: "gold_xp",
        summary: `+${roll.goldGained}g +${roll.xpGained}xp`,
        goldGained: roll.goldGained,
        xpGained: roll.xpGained,
        material: null,
      });
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
      cooldownTimer.current = setTimeout(() => setIsInteracting(false), duration);
    } else if (roll.type === "gather" && roll.material) {
      gatherXpRef.current = 0;
      setGatherMaterial(roll.material);
      setGatherAttempts(roll.gatherAttempts);
      setShowGather(true);
    } else if (roll.type === "battle" && roll.npc) {
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
        const totalXp = gatherXpRef.current;
        addLogEntry({
          id: `g-${Date.now()}`,
          timestamp: Date.now(),
          type: "gather",
          summary: `Gathered ${mat.type} ×${gathered.length}`,
          goldGained: 0,
          xpGained: totalXp,
          material: mat,
        });
      }
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
      cooldownTimer.current = setTimeout(() => setIsInteracting(false), 500);
    },
    [addMaterials, addLogEntry]
  );

  const handleBattleComplete = useCallback(
    (victory: boolean, goldReward: number, xpReward: number) => {
      setShowBattle(false);
      if (victory && (goldReward > 0 || xpReward > 0)) {
        applyGoldXp(goldReward, xpReward);
      }
      const npc = battleNpc;
      if (npc) {
        // Roll for material drop on victory
        let droppedMat: Material | null = null;
        if (victory) {
          droppedMat = rollNpcDrop(npc);
          if (droppedMat) addMaterials([droppedMat]);
        }
        addLogEntry({
          id: `b-${Date.now()}`,
          timestamp: Date.now(),
          type: "battle",
          summary: victory
            ? `Defeated ${npc.name} +${goldReward}g +${xpReward}xp${droppedMat ? ` · dropped ${droppedMat.type}` : ""}`
            : `Fled from ${npc.name}`,
          goldGained: goldReward,
          xpGained: xpReward,
          material: droppedMat,
          victory,
        });
      }
      cooldownTimer.current = setTimeout(() => setIsInteracting(false), 500);
    },
    [battleNpc, applyGoldXp, addLogEntry, addMaterials]
  );

  // ── List item from inventory → AH ─────────────────────────────────────────
  const handleListOnAh = useCallback((entry: MaterialEntry) => {
    setShowStats(false);
    setPreSelectForAh(entry);
    setShowAuction(true);
  }, []);

  const handleAhClose = useCallback(() => {
    setShowAuction(false);
    setPreSelectForAh(null);
  }, []);

  return (
    <View style={styles.root}>
      {/* ── Top: header + stat strip ──────────────────────────────────── */}
      <View style={[styles.topSection, { paddingTop: topPad + 12 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.mapTitle}>Mountain of Supremacy</Text>
        </View>
        <View style={styles.headerBtns}>
          <Pressable
            style={styles.headerBtn}
            onPress={() => setShowAuction(true)}
            hitSlop={4}
          >
            <Feather name="shopping-bag" size={20} color={Colors.game.gold} />
          </Pressable>
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
          <Pressable
            style={[styles.headerBtn, isAuthenticated && styles.headerBtnAuth]}
            onPress={() => setShowAuth(true)}
            hitSlop={4}
          >
            <Feather
              name={isAuthenticated ? "check-circle" : "key"}
              size={20}
              color={isAuthenticated ? Colors.game.green : Colors.game.textDim}
            />
          </Pressable>
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
          {isAuthenticated && authUsername && (
            <>
              <View style={styles.stripDivider} />
              <View style={styles.stripItem}>
                <Feather name="check-circle" size={11} color={Colors.game.green} />
                <Text style={styles.stripUsername}>{authUsername}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* ── Middle spacer ─────────────────────────────────────────────── */}
      <View style={styles.midSpacer} />

      {/* ── Bottom: notification + scene + timer ──────────────────────── */}
      <View style={[styles.bottomSection, { paddingBottom: bottomPad + 16 }]}>
        {ahToasts.map((t) => <AhToast key={t.id} toast={t} />)}
        <EventLogStack logs={gameState.eventLog} />
        <SceneView
          scene={gameState.currentScene}
          artIndex={artIndex}
          onPress={handleScenePress}
          disabled={isInteracting}
        />
        <TimerBar isActive={isInteracting} duration={cooldownDuration} />
      </View>

      {/* Modals */}
      <AuctionHouseModal
        visible={showAuction}
        onClose={handleAhClose}
        preSelectedEntry={preSelectForAh}
      />
      <AuthModal visible={showAuth} onClose={() => setShowAuth(false)} />
      <ChatModal visible={showChat} onClose={() => setShowChat(false)} />
      <StatsModal
        visible={showStats}
        onClose={() => setShowStats(false)}
        onListOnAh={handleListOnAh}
      />
      <GatheringModal
        visible={showGather}
        material={gatherMaterial}
        totalAttempts={gatherAttempts}
        xpToNext={char.xpToNext}
        onComplete={handleGatherComplete}
        onAttemptXp={(xp) => { gatherXpRef.current += xp; applyGoldXp(0, xp); }}
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
  topSection: { paddingHorizontal: 16, gap: 12 },
  midSpacer: { flex: 1, maxHeight: "28%" },
  bottomSection: { paddingHorizontal: 16, gap: 10 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  mapTitle: {
    fontSize: 18, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 0.4,
  },
  headerBtns: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  headerBtn: {
    padding: 8,
    backgroundColor: Colors.game.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.game.border,
    position: "relative",
  },
  headerBtnAuth: {
    borderColor: Colors.game.green + "55",
    backgroundColor: "rgba(34,197,94,0.06)",
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
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.game.gold,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#a07820",
  },
  goldCoinText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#3d2e00" },
  stripLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 1,
  },
  stripValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  stripDivider: { width: 1, height: 20, backgroundColor: Colors.game.border },
  xpTrack: {
    height: 4, backgroundColor: Colors.game.border,
    borderRadius: 2, overflow: "hidden",
  },
  xpFill: { height: "100%", backgroundColor: Colors.game.purple, borderRadius: 2 },
  xpText: { fontSize: 9, fontFamily: "Inter_500Medium", color: Colors.game.textMuted },
  stripUsername: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.green, letterSpacing: 0.5,
    maxWidth: 80,
  },
});
