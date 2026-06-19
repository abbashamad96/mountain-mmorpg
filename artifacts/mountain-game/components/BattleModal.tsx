import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageSourcePropType,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { CharacterStats, NpcBattleStats, RARITY_COLORS, RarityName } from "@/context/GameContext";
import { RarityText } from "./RarityText";
import { BannerLabel, FantasyButton, GemBar, OrnatePanel } from "@/components/ui";

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

// ─── Timeline combat engine ───────────────────────────────────────────────────
// Each actor has a monotonically-increasing `timeline` value.
// Action cost  = 1 / (1 + speed)  — lower speed → higher cost → acts less often.
// Whoever has the LOWER timeline value acts next.
// After acting, their timeline advances by their action cost.
// No real-time delays. No ticks. No AP race-track.
// Max iterations per call is capped at MAX_SYNC_TURNS to prevent blocking;
// if hit, we yield via a single zero-delay timeout and continue.
const MAX_SYNC_TURNS = 50;

function actionCost(speed: number): number {
  return Math.max(10, 15000 / (100 + 0.1 * Math.max(0, speed)));
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
  // Bar: 0 = NPC acting / 100 = player's turn ready
  const [barPct, setBarPct]     = useState(0);

  // Timeline refs — the only combat state that matters
  const playerHpRef      = useRef(0);
  const npcHpRef         = useRef(0);
  const playerTimeline   = useRef(0); // time until player's NEXT action
  const npcTimeline      = useRef(0); // time until NPC's NEXT action
  const phaseRef         = useRef<BattlePhase>("intro");
  const npcRef           = useRef(npc);
  npcRef.current = npc;
  const playerStatsRef   = useRef(playerStats);
  playerStatsRef.current = playerStats;

  // Cancellation handle for the single yield timeout (safety cap only)
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
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

  // ── Timeline combat resolution ────────────────────────────────────────────
  // Resolves NPC turns synchronously in a bounded loop, then stops when it
  // is the player's turn. If MAX_SYNC_TURNS is hit, yields once via a
  // zero-delay timeout and picks up again — preventing any UI freeze.
  function resolveNextTurn() {
    const n = npcRef.current;
    if (!n || phaseRef.current !== "fighting") return;

    const pCost = actionCost(playerStatsRef.current.speed);
    const nCost = actionCost(n.spd);

    let iters = 0;

    while (phaseRef.current === "fighting" && iters < MAX_SYNC_TURNS) {
      iters++;

      if (playerTimeline.current <= npcTimeline.current) {
        // ── Player's turn ──────────────────────────────────────────────────
        setBarPct(100);
        phaseRef.current = "player_turn";
        setPhase("player_turn");
        startPulse();
        return; // stop — wait for ATTACK press

      } else {
        // ── NPC's turn ────────────────────────────────────────────────────
        npcTimeline.current += nCost;
        setBarPct(0);

        const dmg     = rolled(n.atk);
        const blocked = Math.random() * 100 < calcBlock(playerStatsRef.current.defence);
        const finalDmg = blocked ? 0 : dmg;
        const newHp   = Math.max(0, playerHpRef.current - finalDmg);
        playerHpRef.current = newHp;
        setPlayerHp(newHp);
        shake(playerShake);
        addLine(
          blocked ? `${n.name} attacks — BLOCKED!` : `${n.name} hits you for ${finalDmg}!`,
          blocked ? Colors.game.blue : Colors.game.red,
        );

        if (newHp <= 0) { endBattle("defeat"); return; }
      }
    }

    // Safety yield — only reached if the speed ratio is extreme
    if (phaseRef.current === "fighting") {
      pendingRef.current = setTimeout(resolveNextTurn, 0);
    }
  }

  function doPlayerAttack() {
    const n = npcRef.current;
    if (!n) return;

    const dmg   = rolled(playerStatsRef.current.strength);
    const newHp = Math.max(0, npcHpRef.current - dmg);
    npcHpRef.current = newHp;
    setNpcHp(newHp);
    shake(npcShake);
    addLine(`You strike for ${dmg}!`, Colors.game.gold);

    if (newHp <= 0) { endBattle("victory"); return; }

    // Advance player's timeline by their action cost, then resolve again
    playerTimeline.current += actionCost(playerStatsRef.current.speed);
    setBarPct(0);
    resolveNextTurn();
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
      addLine("You were defeated!", Colors.game.red);
    }
    setTimeout(() => closeModal(result === "victory"), 900);
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
      const maxHp = Math.max(1, Math.floor(playerStatsRef.current.health * 10));
      playerHpRef.current = maxHp;
      npcHpRef.current    = npc.hp;
      // Both start with their first action cost — whoever is lower goes first
      playerTimeline.current = actionCost(playerStatsRef.current.speed);
      npcTimeline.current    = actionCost(npc.spd);
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
        resolveNextTurn();
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

  const maxHp        = Math.max(1, Math.floor(playerStats.health * 10));
  const pHpPct       = Math.max(0, (playerHp / maxHp) * 100);
  const nHpPct       = Math.max(0, (npcHp / npc.maxHp) * 100);
  const rarityColor  = RARITY_COLORS[npc.rarity];
  const isPlayerTurn = phase === "player_turn";
  const isFighting   = phase === "fighting" || phase === "player_turn";
  const blockPct     = calcBlock(playerStats.defence);

  // Derived turn info for the calc card
  const pSpd  = Math.max(0, playerStats.speed);
  const nSpd  = Math.max(0, npc.spd);
  const pCost = actionCost(pSpd);
  const nCost = actionCost(nSpd);
  // How many NPC turns per 1 player turn (or vice versa)
  const ratio = pCost / nCost; // > 1 → NPC is faster
  const ratioTxt =
    ratio > 1.05
      ? `Enemy ${ratio.toFixed(1)}× faster`
      : ratio < 0.95
      ? `You ${(1 / ratio).toFixed(1)}× faster`
      : "Same speed";

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <View style={{ width: "100%", maxWidth: 420, alignSelf: "center" }}>
          <Animated.View style={[styles.cardWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <OrnatePanel padding={18} glow contentStyle={styles.cardContent}>

            {/* Title */}
            <View style={styles.titleRow}>
              <BannerLabel title="⚔ BATTLE" size="sm" />
              <RarityText rarity={npc.rarity} version={npc.version} label={npc.name} style={styles.npcName} />
            </View>

            {/* NPC splash */}
            <Animated.View style={[styles.npcWrap, { transform: [{ translateX: npcShake }] }]}>
              <Image source={NPC_SPLASH[npc.rarity]} style={styles.npcImg} resizeMode="cover" />
              <View style={[styles.npcBorder, { borderColor: rarityColor }]} />
              <View style={styles.npcHpBar}>
                <GemBar progress={nHpPct / 100} gem="ruby" height={7} style={{ flex: 1 }} />
                <Text style={[styles.npcHpNum, { color: rarityColor }]}>{npcHp}/{npc.maxHp}</Text>
              </View>
            </Animated.View>

            {/* Player HP */}
            <Animated.View style={[styles.pHpRow, { transform: [{ translateX: playerShake }] }]}>
              <Text style={styles.pHpLabel}>YOU</Text>
              <GemBar
                progress={pHpPct / 100}
                gem={pHpPct > 50 ? "emerald" : pHpPct > 25 ? "gold" : "ruby"}
                height={9}
                style={{ flex: 1 }}
              />
              <Text style={styles.hpNum}>{playerHp}/{maxHp}</Text>
            </Animated.View>

            {/* Turn readiness bar */}
            <View style={styles.barRow}>
              <Text style={[styles.barLabel, isPlayerTurn && styles.barLabelReady]}>
                {isPlayerTurn ? "YOUR TURN" : "NEXT TURN"}
              </Text>
              <GemBar progress={barPct / 100} gem="gold" height={9} style={{ flex: 1 }} />
            </View>

            {/* Combat info card */}
            <View style={styles.calcCard}>
              <View style={styles.calcHeader}>
                <Text style={styles.calcHeaderTxt}>YOU</Text>
                <Text style={styles.calcSpacer} />
                <Text style={[styles.calcHeaderTxt, { color: rarityColor, textAlign: "right" }]}>ENEMY</Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={styles.calcVal}>⚡ {Math.round(pSpd)} spd</Text>
                <Text style={styles.calcKey}>SPEED</Text>
                <Text style={[styles.calcVal, { color: rarityColor, textAlign: "right" }]}>⚡ {Math.round(nSpd)} spd</Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={[styles.calcVal, { flex: 3, textAlign: "center", color: Colors.game.textMuted }]}>{ratioTxt}</Text>
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
                <FantasyButton
                  label="FLEE"
                  icon="exit-outline"
                  variant="dark"
                  onPress={handleFlee}
                  style={styles.fleeBtn}
                />
                <Animated.View style={[styles.atkWrap, isPlayerTurn && { transform: [{ scale: pulseAnim }] }]}>
                  <FantasyButton
                    label={isPlayerTurn ? "⚔  ATTACK" : "• • •"}
                    icon={isPlayerTurn ? "flash" : undefined}
                    variant="ruby"
                    size="lg"
                    onPress={handleAttack}
                    disabled={!isPlayerTurn}
                    glow={isPlayerTurn}
                    fullWidth
                  />
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

          </OrnatePanel>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(7,4,9,0.8)",
    justifyContent: "center", alignItems: "center", padding: 20,
  },
  cardWrap: { width: "100%", maxWidth: 420 },
  cardContent: { gap: 10 },
  titleRow: { alignItems: "center", gap: 8 },
  npcName: { fontSize: 22, fontFamily: "Inter_700Bold" },

  npcWrap: {
    width: "100%", height: 150, borderRadius: 14, overflow: "hidden",
    borderWidth: 1, borderColor: Colors.game.gold + "33",
  },
  npcImg: { width: "100%", height: "100%" },
  npcBorder: { ...StyleSheet.absoluteFillObject, borderRadius: 14, borderWidth: 2 },
  npcHpBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(7,4,9,0.7)",
    paddingHorizontal: 10, paddingVertical: 6,
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  npcHpNum: { fontSize: 11, fontFamily: "Inter_500Medium", minWidth: 50, textAlign: "right" },

  pHpRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pHpLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.game.green, letterSpacing: 1, width: 28 },
  hpNum: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.game.textDim, width: 55, textAlign: "right" },

  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 1, width: 58 },
  barLabelReady: { color: Colors.game.gold },

  calcCard: {
    backgroundColor: Colors.game.surface,
    borderRadius: 12, padding: 10, gap: 5,
    borderWidth: 1, borderColor: Colors.game.gold + "22",
  },
  calcHeader: { flexDirection: "row", alignItems: "center" },
  calcHeaderTxt: { flex: 1, fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 2 },
  calcSpacer: { width: 50 },
  calcRow: { flexDirection: "row", alignItems: "center" },
  calcKey: { width: 50, fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, textAlign: "center", letterSpacing: 1 },
  calcVal: { flex: 1, fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.game.textDim },

  log: {
    maxHeight: 72, backgroundColor: Colors.game.surface, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: Colors.game.gold + "22",
  },
  logEmpty: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textMuted, fontStyle: "italic", textAlign: "center" },
  logLine: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 2, lineHeight: 18 },

  btnRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  fleeBtn: { flex: 1 },
  atkWrap: { flex: 2 },

  resultRow: { alignItems: "center", gap: 6 },
  victoryTxt: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.game.gold, letterSpacing: 4 },
  defeatTxt:  { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.game.red,  letterSpacing: 4 },
  rewardRow: { flexDirection: "row", gap: 16 },
  goldTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  xpTxt:   { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.game.purpleLight },
});
