import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { CharacterStats, NpcBattleStats, RARITY_COLORS, RarityName } from "@/context/GameContext";
import { RarityText } from "./RarityText";

const NPC_SPLASH: Record<RarityName, ImageSourcePropType> = {
  Common:    require("@/assets/images/npcs/npc_common.png"),
  Uncommon:  require("@/assets/images/npcs/npc_uncommon.png"),
  Rare:      require("@/assets/images/npcs/npc_rare.png"),
  Epic:      require("@/assets/images/npcs/npc_epic.png"),
  Elite:     require("@/assets/images/npcs/npc_elite.png"),
  Legendary: require("@/assets/images/npcs/npc_legendary.png"),
  Superior:  require("@/assets/images/npcs/npc_superior.png"),
  Cosmic:    require("@/assets/images/npcs/npc_cosmic.png"),
};

// ─── Race-track constants ─────────────────────────────────────────────────────
// Track is 15 000 units long. Each speed point = 1 unit/tick.
// At speed=1 a full track takes BASE_TURN_MS real milliseconds.
const TRACK = 15000;
const BASE_TURN_MS = 2000; // speed=1 → 2 s per full lap
const UNIT_MS = BASE_TURN_MS / TRACK; // ~0.1333 ms per track unit

function lapMs(remainingUnits: number, speed: number): number {
  return Math.max(60, (remainingUnits / Math.max(1, speed)) * UNIT_MS);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface BattleModalProps {
  visible: boolean;
  npc: NpcBattleStats | null;
  playerStats: CharacterStats;
  playerLevel: number;
  onComplete: (victory: boolean, goldReward: number, xpReward: number) => void;
}

type BattlePhase = "intro" | "fighting" | "player_turn" | "victory" | "defeat" | "fled";

interface LogLine { id: number; text: string; color: string }
let lineId = 0;

function calcBlock(def: number): number { return def / (def + 15000) * 100; }
function rolled(base: number): number {
  return Math.max(1, Math.round(base * (0.9 + Math.random() * 0.2)));
}

// ─── Component ────────────────────────────────────────────────────────────────
export function BattleModal({ visible, npc, playerStats, playerLevel, onComplete }: BattleModalProps) {
  const [phase, setPhase] = useState<BattlePhase>("intro");
  const [playerHp, setPlayerHp] = useState(0);
  const [npcHp, setNpcHp] = useState(0);
  const [log, setLog] = useState<LogLine[]>([]);

  // Internal combat state (refs = no re-render cost)
  const playerHpRef  = useRef(0);
  const npcHpRef     = useRef(0);
  const playerAP     = useRef(0); // 0–TRACK
  const npcAP        = useRef(0); // 0–TRACK
  const phaseRef     = useRef<BattlePhase>("intro");
  const npcRef       = useRef(npc);
  npcRef.current = npc;

  // Scheduling
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0.85)).current;
  const npcShake    = useRef(new Animated.Value(0)).current;
  const playerShake = useRef(new Animated.Value(0)).current;
  const barAnim     = useRef(new Animated.Value(0)).current; // 0-100 player track %
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const pulseLoop   = useRef<Animated.CompositeAnimation | null>(null);

  const logRef = useRef<ScrollView>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function clearPending() {
    if (pendingRef.current) { clearTimeout(pendingRef.current); pendingRef.current = null; }
  }

  function addLine(text: string, color: string) {
    setLog(prev => [...prev, { id: lineId++, text, color }].slice(-20));
    setTimeout(() => logRef.current?.scrollToEnd({ animated: false }), 40);
  }

  function shake(anim: Animated.Value) {
    Animated.sequence([
      Animated.timing(anim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }

  function startPulse() {
    pulseLoop.current?.stop();
    pulseLoop.current = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.07, duration: 440, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0.96, duration: 440, useNativeDriver: true }),
    ]));
    pulseLoop.current.start();
  }

  function stopPulse() { pulseLoop.current?.stop(); pulseAnim.setValue(1); }

  // Smoothly animate the yellow bar to targetPct over durationMs
  function animateBar(targetPct: number, durationMs: number) {
    Animated.timing(barAnim, {
      toValue: Math.min(100, Math.max(0, targetPct)),
      duration: Math.max(60, durationMs),
      useNativeDriver: false,
    }).start();
  }

  // ── Core turn scheduler ───────────────────────────────────────────────────
  // Called after every action to determine what happens next.
  // All game logic is calculated here synchronously; only the visual delay
  // (setTimeout + Animated.timing) is asynchronous.
  function scheduleNextTurn() {
    if (phaseRef.current !== "fighting") return;
    const npc = npcRef.current;
    if (!npc) return;

    const pSpeed = Math.max(1, playerStats.speed);
    const nSpeed = Math.max(1, npc.spd);

    // Units remaining until each crosses the finish line
    const pRemaining = TRACK - playerAP.current;
    const nRemaining = TRACK - npcAP.current;

    // "Ticks" (virtual) until each finishes their lap
    const pTicks = pRemaining / pSpeed;
    const nTicks = nRemaining / nSpeed;

    // Real ms for each
    const pMs = Math.max(60, pTicks * UNIT_MS);
    const nMs = Math.max(60, nTicks * UNIT_MS);

    if (pTicks <= nTicks) {
      // ── Player's turn next ────────────────────────────────────────────────
      // During pTicks, NPC advances: pTicks × nSpeed — guaranteed < TRACK
      npcAP.current = Math.min(TRACK - 1, npcAP.current + Math.floor(pTicks * nSpeed));

      animateBar(100, pMs);
      pendingRef.current = setTimeout(() => {
        if (phaseRef.current !== "fighting") return;
        playerAP.current = TRACK;
        phaseRef.current = "player_turn";
        setPhase("player_turn");
        startPulse();
      }, pMs);

    } else {
      // ── NPC's turn next ───────────────────────────────────────────────────
      // During nTicks, player advances: nTicks × pSpeed — guaranteed < TRACK
      const newPlayerAP = Math.min(TRACK - 1, playerAP.current + Math.floor(nTicks * pSpeed));
      playerAP.current = newPlayerAP;
      const newBarPct = (newPlayerAP / TRACK) * 100;

      animateBar(newBarPct, nMs);
      pendingRef.current = setTimeout(() => {
        if (phaseRef.current !== "fighting") return;
        npcAP.current = 0;
        doNpcAttack();
      }, nMs);
    }
  }

  function doNpcAttack() {
    const npc = npcRef.current;
    if (!npc || phaseRef.current !== "fighting") return;

    const dmgRaw = rolled(npc.atk);
    const blocked = Math.random() * 100 < calcBlock(playerStats.defence);
    const dmg = blocked ? 0 : dmgRaw;
    const newHp = Math.max(0, playerHpRef.current - dmg);
    playerHpRef.current = newHp;
    setPlayerHp(newHp);
    shake(playerShake);

    addLine(blocked
      ? `${npc.name} attacks — BLOCKED!`
      : `${npc.name} hits you for ${dmg}!`,
      blocked ? Colors.game.blue : Colors.game.red);

    if (newHp <= 0) {
      endBattle("defeat");
      return;
    }
    scheduleNextTurn();
  }

  function doPlayerAttack() {
    const npc = npcRef.current;
    if (!npc) return;

    const dmg = rolled(playerStats.strength);
    const newHp = Math.max(0, npcHpRef.current - dmg);
    npcHpRef.current = newHp;
    setNpcHp(newHp);
    shake(npcShake);
    addLine(`You strike for ${dmg}!`, Colors.game.gold);

    if (newHp <= 0) {
      endBattle("victory");
      return;
    }
    playerAP.current = 0;
    scheduleNextTurn();
  }

  function endBattle(result: "victory" | "defeat") {
    clearPending();
    stopPulse();
    phaseRef.current = result;
    setPhase(result);
    barAnim.stopAnimation();

    const npc = npcRef.current;
    if (result === "victory" && npc) {
      addLine(`${npc.name} defeated! +${npc.goldReward}g  ✦+${npc.xpReward} XP`, Colors.game.green);
    } else {
      addLine("You retreat safely.", Colors.game.red);
    }
    setTimeout(() => closeModal(result === "victory"), 1200);
  }

  function closeModal(victory: boolean) {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 240, useNativeDriver: true }),
    ]).start(() => {
      const n = npcRef.current;
      onComplete(victory, victory && n ? n.goldReward : 0, victory && n ? n.xpReward : 0);
    });
  }

  // ── Mount / unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    if (visible && npc) {
      clearPending();
      stopPulse();
      const maxHp = Math.max(1, Math.floor(playerStats.health));
      playerHpRef.current = maxHp;
      npcHpRef.current = npc.hp;
      playerAP.current = 0;
      npcAP.current = 0;
      phaseRef.current = "intro";
      setPhase("intro");
      setPlayerHp(maxHp);
      setNpcHp(npc.hp);
      setLog([]);
      barAnim.setValue(0);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 90, friction: 8 }),
      ]).start(() => {
        phaseRef.current = "fighting";
        setPhase("fighting");
        addLine("Battle started!", Colors.game.gold);
        scheduleNextTurn();
      });
    }
    return () => {
      clearPending();
      stopPulse();
    };
  }, [visible]);

  // ── Player action handlers ────────────────────────────────────────────────
  const handleAttack = useCallback(() => {
    if (phaseRef.current !== "player_turn") return;
    clearPending();
    stopPulse();
    phaseRef.current = "fighting";
    setPhase("fighting");
    doPlayerAttack();
  }, []);

  const handleFlee = useCallback(() => {
    if (phaseRef.current !== "fighting" && phaseRef.current !== "player_turn") return;
    clearPending();
    stopPulse();
    phaseRef.current = "fled";
    setPhase("fled");
    barAnim.stopAnimation();
    addLine("You flee from battle!", Colors.game.textMuted);
    setTimeout(() => closeModal(false), 700);
  }, []);

  // ── Derived display values ────────────────────────────────────────────────
  if (!npc) return null;

  const maxHp = Math.max(1, Math.floor(playerStats.health));
  const pHpPct = Math.max(0, (playerHp / maxHp) * 100);
  const nHpPct = Math.max(0, (npcHp / npc.maxHp) * 100);
  const rarityColor = RARITY_COLORS[npc.rarity];
  const isPlayerTurn = phase === "player_turn";
  const isFighting = phase === "fighting" || phase === "player_turn";
  const blockPct = calcBlock(playerStats.defence);

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>

          {/* Title */}
          <View style={styles.titleRow}>
            <Text style={styles.battleLabel}>⚔ BATTLE</Text>
            <RarityText rarity={npc.rarity} version={npc.version} label={npc.name} style={styles.npcName} />
          </View>

          {/* NPC splash */}
          <Animated.View style={[styles.npcWrap, { transform: [{ translateX: npcShake }] }]}>
            <Image source={NPC_SPLASH[npc.rarity]} style={styles.npcImg} resizeMode="cover" />
            <View style={[styles.npcBorder, { borderColor: rarityColor }]} />
            <View style={styles.npcHpBar}>
              <View style={styles.npcHpTrack}>
                <View style={[styles.npcHpFill, { width: `${nHpPct}%` as any, backgroundColor: rarityColor }]} />
              </View>
              <Text style={[styles.npcHpNum, { color: rarityColor }]}>{npcHp}/{npc.maxHp}</Text>
            </View>
          </Animated.View>

          {/* Player HP */}
          <Animated.View style={[styles.pHpRow, { transform: [{ translateX: playerShake }] }]}>
            <Text style={styles.pHpLabel}>YOU</Text>
            <View style={styles.hpTrack}>
              <View style={[styles.hpFill, {
                width: `${pHpPct}%` as any,
                backgroundColor: pHpPct > 50 ? Colors.game.green : pHpPct > 25 ? Colors.game.gold : Colors.game.red,
              }]} />
            </View>
            <Text style={styles.hpNum}>{playerHp}/{maxHp}</Text>
          </Animated.View>

          {/* Yellow turn bar */}
          <View style={styles.barRow}>
            <Text style={[styles.barLabel, isPlayerTurn && styles.barLabelReady]}>
              {isPlayerTurn ? "YOUR TURN" : "NEXT TURN"}
            </Text>
            <View style={styles.barTrack}>
              <Animated.View style={[styles.barFill, {
                width: barAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
                backgroundColor: isPlayerTurn ? Colors.game.gold : "#5a4a08",
              }]} />
            </View>
          </View>

          {/* Quick stats */}
          <View style={styles.statsRow}>
            <Text style={styles.chip}>⚔ {Math.round(playerStats.strength * 0.9)}–{Math.round(playerStats.strength * 1.1)}</Text>
            <Text style={styles.chip}>🛡 {blockPct.toFixed(1)}%</Text>
            <Text style={styles.chip}>⚡ {playerStats.speed} spd</Text>
            <Text style={[styles.chip, { color: rarityColor }]}>👾 {npc.spd} spd</Text>
          </View>

          {/* Log */}
          <ScrollView ref={logRef} style={styles.log} showsVerticalScrollIndicator={false}>
            {log.length === 0 && <Text style={styles.logEmpty}>The battle begins...</Text>}
            {log.map(l => (
              <Text key={l.id} style={[styles.logLine, { color: l.color }]}>› {l.text}</Text>
            ))}
          </ScrollView>

          {/* Buttons */}
          {isFighting && (
            <View style={styles.btnRow}>
              <Pressable style={styles.fleeBtn} onPress={handleFlee}>
                <Text style={styles.fleeTxt}>FLEE</Text>
              </Pressable>
              <Animated.View style={[{ flex: 2 }, isPlayerTurn && { transform: [{ scale: pulseAnim }] }]}>
                <Pressable
                  style={[styles.atkBtn, !isPlayerTurn && styles.atkBtnOff]}
                  onPress={handleAttack}
                  disabled={!isPlayerTurn}
                >
                  <Text style={[styles.atkTxt, !isPlayerTurn && styles.atkTxtOff]}>
                    {isPlayerTurn ? "⚔  ATTACK" : "• • •"}
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          )}

          {phase === "victory" && (
            <View style={styles.resultRow}>
              <Text style={styles.victoryTxt}>VICTORY!</Text>
              <View style={styles.rewardRow}>
                <Text style={styles.goldTxt}>+{npc.goldReward} G</Text>
                <Text style={styles.xpTxt}>+{npc.xpReward} XP</Text>
              </View>
            </View>
          )}
          {(phase === "defeat" || phase === "fled") && (
            <View style={styles.resultRow}>
              <Text style={styles.defeatTxt}>{phase === "fled" ? "FLED" : "DEFEATED"}</Text>
            </View>
          )}

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.93)",
    justifyContent: "center", alignItems: "center", padding: 20,
  },
  card: {
    width: "100%", backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 22, padding: 20,
    borderWidth: 1, borderColor: Colors.game.border, gap: 10,
  },
  titleRow: { alignItems: "center", gap: 4 },
  battleLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 4 },
  npcName: { fontSize: 22, fontFamily: "Inter_700Bold" },

  npcWrap: { width: "100%", height: 150, borderRadius: 14, overflow: "hidden" },
  npcImg: { width: "100%", height: "100%" },
  npcBorder: { ...StyleSheet.absoluteFillObject, borderRadius: 14, borderWidth: 2 },
  npcHpBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10, paddingVertical: 6,
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  npcHpTrack: { flex: 1, height: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 3, overflow: "hidden" },
  npcHpFill: { height: "100%", borderRadius: 3 },
  npcHpNum: { fontSize: 11, fontFamily: "Inter_500Medium", minWidth: 50, textAlign: "right" },

  pHpRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pHpLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.game.green, letterSpacing: 1, width: 28 },
  hpTrack: { flex: 1, height: 8, backgroundColor: Colors.game.border, borderRadius: 4, overflow: "hidden" },
  hpFill: { height: "100%", borderRadius: 4 },
  hpNum: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.game.textDim, width: 55, textAlign: "right" },

  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 1.5, width: 56 },
  barLabelReady: { color: Colors.game.gold },
  barTrack: {
    flex: 1, height: 8,
    backgroundColor: "rgba(80,60,0,0.25)",
    borderRadius: 4, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(80,60,0,0.35)",
  },
  barFill: { height: "100%", borderRadius: 4 },

  statsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  chip: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.game.textDim },

  log: { maxHeight: 80, backgroundColor: Colors.game.surface, borderRadius: 10, padding: 10 },
  logEmpty: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textMuted, fontStyle: "italic", textAlign: "center" },
  logLine: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 2, lineHeight: 18 },

  btnRow: { flexDirection: "row", gap: 10 },
  fleeBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center",
    borderWidth: 1, borderColor: Colors.game.border, backgroundColor: Colors.game.surface,
  },
  fleeTxt: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 2 },
  atkBtn: { flex: 1, backgroundColor: Colors.game.red, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  atkBtnOff: { backgroundColor: Colors.game.surface, borderWidth: 1, borderColor: Colors.game.border },
  atkTxt: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 2 },
  atkTxtOff: { color: Colors.game.textMuted, fontSize: 17, letterSpacing: 4 },

  resultRow: { alignItems: "center", gap: 6 },
  victoryTxt: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.game.gold, letterSpacing: 4 },
  defeatTxt: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.game.red, letterSpacing: 4 },
  rewardRow: { flexDirection: "row", gap: 16 },
  goldTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  xpTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.game.purpleLight },
});
