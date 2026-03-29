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

// ─── NPC images ───────────────────────────────────────────────────────────────
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

// ─── Turn formula ─────────────────────────────────────────────────────────────
// Action cost (ticks) = 15000 / (100 + 0.1 × speed)
// 1 tick = TICK_MS real milliseconds
const TRACK = 15000;
const TICK_MS = 10; // ms per virtual tick

function actionCostTicks(speed: number): number {
  return TRACK / (100 + 0.1 * Math.max(0, speed));
}
function turnMs(speed: number): number {
  return actionCostTicks(speed) * TICK_MS;
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

function calcBlock(def: number) { return def / (def + 15000) * 100; }
function rolled(base: number)   { return Math.max(1, Math.round(base * (0.9 + Math.random() * 0.2))); }

// ─── Component ────────────────────────────────────────────────────────────────
export function BattleModal({ visible, npc, playerStats, playerLevel, onComplete }: BattleModalProps) {
  const [phase, setPhase]       = useState<BattlePhase>("intro");
  const [playerHp, setPlayerHp] = useState(0);
  const [npcHp, setNpcHp]       = useState(0);
  const [log, setLog]           = useState<LogLine[]>([]);
  // Instant bar: just a number 0-100, set immediately on each event — no animation
  const [barPct, setBarPct]     = useState(0);

  // Refs for combat state (no re-render cost)
  const playerHpRef = useRef(0);
  const npcHpRef    = useRef(0);
  const playerAP    = useRef(0); // current position on the 0–TRACK race
  const npcAP       = useRef(0);
  const phaseRef    = useRef<BattlePhase>("intro");
  const npcRef      = useRef(npc);
  npcRef.current = npc;

  // Single pending timeout handle
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations (entry/exit + hit shakes only — not the bar)
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0.85)).current;
  const npcShake    = useRef(new Animated.Value(0)).current;
  const playerShake = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const pulseLoop   = useRef<Animated.CompositeAnimation | null>(null);

  const logRef = useRef<ScrollView>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function clearPending() {
    if (pendingRef.current) { clearTimeout(pendingRef.current); pendingRef.current = null; }
  }

  function addLine(text: string, color: string) {
    setLog(prev => [...prev, { id: lineId++, text, color }].slice(-20));
    setTimeout(() => logRef.current?.scrollToEnd({ animated: false }), 30);
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
      Animated.timing(pulseAnim, { toValue: 1.06, duration: 420, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0.96, duration: 420, useNativeDriver: true }),
    ]));
    pulseLoop.current.start();
  }
  function stopPulse() { pulseLoop.current?.stop(); pulseAnim.setValue(1); }

  // ── Core scheduler ───────────────────────────────────────────────────────
  // Everything is calculated synchronously here.
  // Only real-time delay = one setTimeout per event. Zero ongoing traffic.
  function scheduleNextTurn() {
    if (phaseRef.current !== "fighting") return;
    const n = npcRef.current;
    if (!n) return;

    const pSpd = Math.max(0, playerStats.speed);
    const nSpd = Math.max(0, n.spd);

    // Ticks until each reaches the finish line from their current position
    const pCostFull = actionCostTicks(pSpd);   // ticks for a full lap
    const nCostFull = actionCostTicks(nSpd);

    // Ticks remaining = fraction of lap left × full cost
    const pTicksLeft = ((TRACK - playerAP.current) / TRACK) * pCostFull;
    const nTicksLeft = ((TRACK - npcAP.current)    / TRACK) * nCostFull;

    if (pTicksLeft <= nTicksLeft) {
      // Player acts next
      // Advance NPC's position during those ticks (won't cross — guaranteed by ≤)
      const npcAdvanceFrac = nTicksLeft === 0 ? 0 : pTicksLeft / nCostFull;
      npcAP.current = Math.min(TRACK - 1, npcAP.current + Math.floor(npcAdvanceFrac * TRACK));

      const delayMs = Math.max(60, pTicksLeft * TICK_MS);
      // Bar snaps to 100 now so the player can see their turn is imminent
      setBarPct(99); // show near-full immediately; jumps to 100 when phase flips

      pendingRef.current = setTimeout(() => {
        if (phaseRef.current !== "fighting") return;
        playerAP.current = TRACK;
        setBarPct(100);
        phaseRef.current = "player_turn";
        setPhase("player_turn");
        startPulse();
      }, delayMs);

    } else {
      // NPC acts next — instantly advance player bar to their new position
      const playerAdvanceFrac = pCostFull === 0 ? 0 : nTicksLeft / pCostFull;
      const newPlayerAP = Math.min(TRACK - 1, playerAP.current + Math.floor(playerAdvanceFrac * TRACK));
      playerAP.current = newPlayerAP;
      // Snap bar to new position immediately — no animation
      setBarPct(Math.round((newPlayerAP / TRACK) * 100));

      const delayMs = Math.max(60, nTicksLeft * TICK_MS);
      pendingRef.current = setTimeout(() => {
        if (phaseRef.current !== "fighting") return;
        npcAP.current = 0;
        doNpcAttack();
      }, delayMs);
    }
  }

  function doNpcAttack() {
    const n = npcRef.current;
    if (!n || phaseRef.current !== "fighting") return;

    const dmg = rolled(n.atk);
    const blocked = Math.random() * 100 < calcBlock(playerStats.defence);
    const finalDmg = blocked ? 0 : dmg;
    const newHp = Math.max(0, playerHpRef.current - finalDmg);
    playerHpRef.current = newHp;
    setPlayerHp(newHp);
    shake(playerShake);

    addLine(
      blocked ? `${n.name} attacks — BLOCKED!` : `${n.name} hits you for ${finalDmg}!`,
      blocked ? Colors.game.blue : Colors.game.red,
    );

    if (newHp <= 0) { endBattle("defeat"); return; }
    scheduleNextTurn();
  }

  function doPlayerAttack() {
    const n = npcRef.current;
    if (!n) return;

    const dmg = rolled(playerStats.strength);
    const newHp = Math.max(0, npcHpRef.current - dmg);
    npcHpRef.current = newHp;
    setNpcHp(newHp);
    shake(npcShake);
    addLine(`You strike for ${dmg}!`, Colors.game.gold);

    if (newHp <= 0) { endBattle("victory"); return; }
    playerAP.current = 0;
    setBarPct(0);
    scheduleNextTurn();
  }

  function endBattle(result: "victory" | "defeat") {
    clearPending();
    stopPulse();
    phaseRef.current = result;
    setPhase(result);
    const n = npcRef.current;
    if (result === "victory" && n) {
      addLine(`${n.name} defeated! +${n.goldReward}g  ✦+${n.xpReward} XP`, Colors.game.green);
    } else {
      addLine("You retreat safely.", Colors.game.red);
    }
    setTimeout(() => closeModal(result === "victory"), 1100);
  }

  function closeModal(victory: boolean) {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 220, useNativeDriver: true }),
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
      setBarPct(0);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 90, friction: 8 }),
      ]).start(() => {
        phaseRef.current = "fighting";
        setPhase("fighting");
        addLine("Battle started!", Colors.game.gold);
        scheduleNextTurn();
      });
    }
    return () => { clearPending(); stopPulse(); };
  }, [visible]);

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
    addLine("You flee from battle!", Colors.game.textMuted);
    setTimeout(() => closeModal(false), 600);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  if (!npc) return null;

  const maxHp       = Math.max(1, Math.floor(playerStats.health));
  const pHpPct      = Math.max(0, (playerHp / maxHp) * 100);
  const nHpPct      = Math.max(0, (npcHp / npc.maxHp) * 100);
  const rarityColor = RARITY_COLORS[npc.rarity];
  const isPlayerTurn = phase === "player_turn";
  const isFighting   = phase === "fighting" || phase === "player_turn";
  const blockPct     = calcBlock(playerStats.defence);

  // Derived turn calculations (shown in card)
  const pSpd     = Math.max(0, playerStats.speed);
  const nSpd     = Math.max(0, npc.spd);
  const pCost    = actionCostTicks(pSpd);
  const nCost    = actionCostTicks(nSpd);
  const pTurnSec = (pCost * TICK_MS / 1000).toFixed(2);
  const nTurnSec = (nCost * TICK_MS / 1000).toFixed(2);

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

          {/* Instant turn bar — no animation, plain View width */}
          <View style={styles.barRow}>
            <Text style={[styles.barLabel, isPlayerTurn && styles.barLabelReady]}>
              {isPlayerTurn ? "YOUR TURN" : "NEXT TURN"}
            </Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, {
                width: `${barPct}%` as any,
                backgroundColor: isPlayerTurn ? Colors.game.gold : "#5a4a08",
              }]} />
            </View>
          </View>

          {/* Turn calculations card */}
          <View style={styles.calcCard}>
            <View style={styles.calcHeader}>
              <Text style={styles.calcHeaderTxt}>YOU</Text>
              <Text style={styles.calcSpacer} />
              <Text style={[styles.calcHeaderTxt, { color: rarityColor, textAlign: "right" }]}>ENEMY</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcVal}>⚡ {pSpd} pts</Text>
              <Text style={styles.calcKey}>SPEED</Text>
              <Text style={[styles.calcVal, { color: rarityColor, textAlign: "right" }]}>⚡ {nSpd} pts</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcVal}>{Math.round(pCost)} tks</Text>
              <Text style={styles.calcKey}>COST</Text>
              <Text style={[styles.calcVal, { color: rarityColor, textAlign: "right" }]}>{Math.round(nCost)} tks</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcVal}>{pTurnSec}s / turn</Text>
              <Text style={styles.calcKey}>TIME</Text>
              <Text style={[styles.calcVal, { color: rarityColor, textAlign: "right" }]}>{nTurnSec}s / turn</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcVal}>⚔ {Math.round(playerStats.strength * 0.9)}–{Math.round(playerStats.strength * 1.1)}</Text>
              <Text style={styles.calcKey} />
              <Text style={[styles.calcVal, { color: rarityColor, textAlign: "right" }]}>🛡 {blockPct.toFixed(1)}% blk</Text>
            </View>
          </View>

          {/* Battle log */}
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

  // ── Turn bar — instant, no animation ─────────────────────────────────────
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 1, width: 58 },
  barLabelReady: { color: Colors.game.gold },
  barTrack: {
    flex: 1, height: 8,
    backgroundColor: "rgba(80,60,0,0.2)",
    borderRadius: 4, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(80,60,0,0.3)",
  },
  barFill: { height: "100%", borderRadius: 4 },

  // ── Calc card ─────────────────────────────────────────────────────────────
  calcCard: {
    backgroundColor: Colors.game.surface,
    borderRadius: 10, padding: 10, gap: 5,
    borderWidth: 1, borderColor: Colors.game.border,
  },
  calcHeader: { flexDirection: "row", alignItems: "center" },
  calcHeaderTxt: { flex: 1, fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 2 },
  calcSpacer: { width: 50 },
  calcRow: { flexDirection: "row", alignItems: "center" },
  calcKey: { width: 50, fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, textAlign: "center", letterSpacing: 1 },
  calcVal: { flex: 1, fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.game.textDim },

  log: { maxHeight: 72, backgroundColor: Colors.game.surface, borderRadius: 10, padding: 10 },
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
  defeatTxt:  { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.game.red,  letterSpacing: 4 },
  rewardRow: { flexDirection: "row", gap: 16 },
  goldTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  xpTxt:   { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.game.purpleLight },
});
