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

// ─── Tick-based combat constants ──────────────────────────────────────────────
const ACTION_THRESHOLD = 1000;  // action points needed to act
const TICK_MS = 10;             // interval in ms — each tick grants speed action points

interface BattleModalProps {
  visible: boolean;
  npc: NpcBattleStats | null;
  playerStats: CharacterStats;
  playerLevel: number;
  onComplete: (victory: boolean, goldReward: number, xpReward: number) => void;
}

type BattlePhase = "intro" | "fighting" | "victory" | "defeat" | "fled";

interface LogLine {
  id: number;
  text: string;
  color: string;
}

let lineId = 0;

function calcBlockChance(def: number): number {
  return (def / (def + 15000)) * 100;
}

function tryBlock(def: number): boolean {
  return Math.random() * 100 < calcBlockChance(def);
}

export function BattleModal({ visible, npc, playerStats, playerLevel, onComplete }: BattleModalProps) {
  const [phase, setPhase] = useState<BattlePhase>("intro");
  const [playerHp, setPlayerHp] = useState(0);
  const [npcHp, setNpcHp] = useState(0);
  const [log, setLog] = useState<LogLine[]>([]);
  // Action bar: 0-100 percent filled (yellow bar)
  const [playerApPct, setPlayerApPct] = useState(0);

  const playerHpRef = useRef(0);
  const npcHpRef = useRef(0);
  const phaseRef = useRef<BattlePhase>("intro");
  const npcRef = useRef(npc);
  npcRef.current = npc;

  // Tick engine refs
  const playerApRef = useRef(0);
  const npcApRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const npcActingRef = useRef(false); // prevent stacked NPC actions

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const npcShakeAnim = useRef(new Animated.Value(0)).current;
  const playerShakeAnim = useRef(new Animated.Value(0)).current;
  const attackPulse = useRef(new Animated.Value(1)).current;
  const attackLoop = useRef<Animated.CompositeAnimation | null>(null);

  const logScrollRef = useRef<ScrollView>(null);

  function runShake(anim: Animated.Value) {
    Animated.sequence([
      Animated.timing(anim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 5, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }

  function addLine(text: string, color: string) {
    setLog((prev) => [...prev, { id: lineId++, text, color }].slice(-20));
    setTimeout(() => logScrollRef.current?.scrollToEnd({ animated: true }), 60);
  }

  function startPulse() {
    attackLoop.current?.stop();
    attackLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(attackPulse, { toValue: 1.07, duration: 480, useNativeDriver: true }),
        Animated.timing(attackPulse, { toValue: 0.96, duration: 480, useNativeDriver: true }),
      ])
    );
    attackLoop.current.start();
  }

  function stopPulse() {
    attackLoop.current?.stop();
    attackPulse.setValue(1);
  }

  function stopTicks() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  function doNpcAttack() {
    if (phaseRef.current !== "fighting") return;
    if (npcActingRef.current) return;
    npcActingRef.current = true;

    const npcData = npcRef.current;
    if (!npcData) { npcActingRef.current = false; return; }

    // NPC damage: 90–110% of atk stat
    const rawDmg = Math.max(1, Math.round(npcData.atk * (0.9 + Math.random() * 0.2)));
    const blocked = tryBlock(playerStats.defence);
    const dmg = blocked ? 0 : Math.max(1, rawDmg);
    const newHp = Math.max(0, playerHpRef.current - dmg);
    playerHpRef.current = newHp;
    setPlayerHp(newHp);
    runShake(playerShakeAnim);

    if (blocked) {
      addLine(`${npcData.name} attacks — BLOCKED!`, Colors.game.blue);
    } else {
      addLine(`${npcData.name} hits you for ${dmg} damage!`, Colors.game.red);
    }

    if (newHp <= 0) {
      phaseRef.current = "defeat";
      setPhase("defeat");
      stopTicks();
      stopPulse();
      addLine("You were defeated! Retreating...", Colors.game.red);
      setTimeout(() => closeModal(false), 1400);
    }
    npcActingRef.current = false;
  }

  function startTicks() {
    stopTicks();
    playerApRef.current = 0;
    npcApRef.current = 0;
    setPlayerApPct(0);

    tickRef.current = setInterval(() => {
      if (phaseRef.current !== "fighting") return;

      // Both player and NPC accumulate AP at their own speed each tick
      playerApRef.current += playerStats.speed;
      npcApRef.current += (npcRef.current?.spd ?? 1);

      // NPC acts first if it reaches threshold (auto-attack, reset AP)
      if (npcApRef.current >= ACTION_THRESHOLD && phaseRef.current === "fighting") {
        npcApRef.current -= ACTION_THRESHOLD;
        doNpcAttack();
      }

      // Player's bar shows their AP progress — caps display at 100%
      const pct = Math.min(100, (playerApRef.current / ACTION_THRESHOLD) * 100);
      setPlayerApPct(pct);

      // Pulse when player's turn is ready
      if (playerApRef.current >= ACTION_THRESHOLD) {
        startPulse();
      }
    }, TICK_MS);
  }

  useEffect(() => {
    if (visible && npc) {
      const maxHp = Math.max(1, Math.floor(playerStats.health));
      playerHpRef.current = maxHp;
      npcHpRef.current = npc.hp;
      phaseRef.current = "intro";
      setPlayerHp(maxHp);
      setNpcHp(npc.hp);
      setLog([]);
      setPlayerApPct(0);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 90, friction: 8 }),
      ]).start(() => {
        phaseRef.current = "fighting";
        setPhase("fighting");
        addLine("Battle started — fill your action bar to attack!", Colors.game.gold);
        startTicks();
      });
    }
    return () => {
      stopTicks();
      stopPulse();
    };
  }, [visible]);

  function calcPlayerDmg() {
    // 90–110% of strength stat
    return Math.max(1, Math.round(playerStats.strength * (0.9 + Math.random() * 0.2)));
  }

  const handleAttack = useCallback(() => {
    if (phaseRef.current !== "fighting") return;
    if (playerApRef.current < ACTION_THRESHOLD) return;
    if (!npcRef.current) return;

    // Consume action points
    playerApRef.current = 0;
    setPlayerApPct(0);
    stopPulse();

    const dmg = calcPlayerDmg();
    const newNpcHp = Math.max(0, npcHpRef.current - dmg);
    npcHpRef.current = newNpcHp;
    setNpcHp(newNpcHp);
    runShake(npcShakeAnim);
    addLine(`You strike for ${dmg} damage!`, Colors.game.gold);

    if (newNpcHp <= 0) {
      phaseRef.current = "victory";
      setPhase("victory");
      stopTicks();
      const g = npcRef.current.goldReward;
      const x = npcRef.current.xpReward;
      addLine(`${npcRef.current.name} defeated! +${g}g  ✦+${x} XP`, Colors.game.green);
      setTimeout(() => closeModal(true), 1400);
    }
  }, []);

  const handleFlee = useCallback(() => {
    if (phaseRef.current !== "fighting") return;
    stopTicks();
    stopPulse();
    phaseRef.current = "fled";
    setPhase("fled");
    addLine("You flee from the battle!", Colors.game.textMuted);
    setTimeout(() => closeModal(false), 800);
  }, []);

  function closeModal(victory: boolean) {
    stopTicks();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 280, useNativeDriver: true }),
    ]).start(() => {
      const n = npcRef.current;
      onComplete(victory, victory && n ? n.goldReward : 0, victory && n ? n.xpReward : 0);
    });
  }

  if (!npc) return null;

  const playerMaxHp = Math.max(1, Math.floor(playerStats.health));
  const pHpPct = Math.max(0, (playerHp / playerMaxHp) * 100);
  const nHpPct = Math.max(0, (npcHp / npc.maxHp) * 100);
  const rarityColor = RARITY_COLORS[npc.rarity];
  const playerReady = playerApPct >= 100;
  const canAttack = phase === "fighting" && playerReady;

  // Block chance display
  const blockChance = (playerStats.defence / (playerStats.defence + 15000)) * 100;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
        >
          {/* Title */}
          <View style={styles.titleRow}>
            <Text style={styles.battleLabel}>⚔ BATTLE</Text>
            <RarityText rarity={npc.rarity} version={npc.version} label={npc.name} style={styles.npcName} />
          </View>

          {/* NPC splash art */}
          <Animated.View style={[styles.npcImageWrap, { transform: [{ translateX: npcShakeAnim }] }]}>
            <Image
              source={NPC_SPLASH[npc.rarity]}
              style={styles.npcImage}
              resizeMode="cover"
            />
            <View style={[styles.npcImageBorder, { borderColor: rarityColor }]} />
            <View style={styles.npcHpOverlay}>
              <View style={styles.npcHpTrack}>
                <View style={[styles.npcHpFill, { width: `${nHpPct}%` as any, backgroundColor: rarityColor }]} />
              </View>
              <Text style={[styles.npcHpNum, { color: rarityColor }]}>{npcHp}/{npc.maxHp}</Text>
            </View>
          </Animated.View>

          {/* Player HP */}
          <Animated.View style={[styles.playerHpRow, { transform: [{ translateX: playerShakeAnim }] }]}>
            <Text style={styles.hpLabelP}>YOU</Text>
            <View style={styles.hpTrack}>
              <View
                style={[
                  styles.hpFill,
                  {
                    width: `${pHpPct}%` as any,
                    backgroundColor:
                      pHpPct > 50 ? Colors.game.green : pHpPct > 25 ? Colors.game.gold : Colors.game.red,
                  },
                ]}
              />
            </View>
            <Text style={styles.hpNum}>{playerHp}/{playerMaxHp}</Text>
          </Animated.View>

          {/* Action bar (yellow) — shows progress toward player's next turn */}
          <View style={styles.actionBarRow}>
            <Text style={styles.actionBarLabel}>TURN</Text>
            <View style={styles.actionBarTrack}>
              <Animated.View
                style={[
                  styles.actionBarFill,
                  {
                    width: `${Math.min(100, playerApPct)}%` as any,
                    backgroundColor: playerReady ? Colors.game.gold : "#7a6010",
                  },
                ]}
              />
            </View>
            <Text style={[styles.actionBarPct, playerReady && styles.actionBarPctReady]}>
              {playerReady ? "READY" : `${Math.floor(playerApPct)}%`}
            </Text>
          </View>

          {/* Combat stats strip */}
          <View style={styles.statsStrip}>
            <Text style={styles.statChip}>⚔ {Math.round(playerStats.strength * 0.9)}–{Math.round(playerStats.strength * 1.1)} dmg</Text>
            <Text style={styles.statChip}>🛡 {blockChance.toFixed(1)}% block</Text>
            <Text style={styles.statChip}>⚡ {playerStats.speed} spd</Text>
            <Text style={[styles.statChipEnemy, { color: rarityColor }]}>👾 {npc.spd} spd</Text>
          </View>

          {/* Battle log */}
          <ScrollView ref={logScrollRef} style={styles.log} showsVerticalScrollIndicator={false}>
            {log.length === 0 && (
              <Text style={styles.logEmpty}>The battle begins...</Text>
            )}
            {log.map((l) => (
              <Text key={l.id} style={[styles.logLine, { color: l.color }]}>
                › {l.text}
              </Text>
            ))}
          </ScrollView>

          {/* Action buttons */}
          {phase === "fighting" && (
            <View style={styles.actionRow}>
              <Pressable style={styles.fleeBtn} onPress={handleFlee}>
                <Text style={styles.fleeBtnText}>FLEE</Text>
              </Pressable>
              <Animated.View style={[{ flex: 2 }, canAttack && { transform: [{ scale: attackPulse }] }]}>
                <Pressable
                  style={[styles.atkBtn, !canAttack && styles.atkBtnDisabled]}
                  onPress={handleAttack}
                  disabled={!canAttack}
                >
                  <Text style={[styles.atkBtnText, !canAttack && styles.atkBtnTextDisabled]}>
                    {canAttack ? "⚔  ATTACK" : "• • •"}
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          )}
          {phase === "victory" && (
            <View style={styles.resultRow}>
              <Text style={styles.victoryText}>VICTORY!</Text>
              <View style={styles.rewardChips}>
                <View style={styles.goldChip}>
                  <View style={styles.goldCoin}><Text style={styles.goldCoinTxt}>G</Text></View>
                  <Text style={styles.rewardGoldTxt}>+{npc.goldReward}</Text>
                </View>
                <View style={styles.xpChip}>
                  <View style={styles.xpGem}><Text style={styles.xpGemTxt}>✦</Text></View>
                  <Text style={styles.rewardXpTxt}>+{npc.xpReward} XP</Text>
                </View>
              </View>
            </View>
          )}
          {(phase === "defeat" || phase === "fled") && (
            <View style={styles.resultRow}>
              <Text style={styles.defeatText}>{phase === "fled" ? "FLED" : "DEFEATED"}</Text>
              <Text style={styles.rewardText}>
                {phase === "fled" ? "You escaped safely." : "You retreat safely."}
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.93)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.game.border,
    gap: 10,
  },
  titleRow: { alignItems: "center", gap: 4 },
  battleLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 4,
  },
  npcName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  npcImageWrap: {
    width: "100%",
    height: 150,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  npcImage: {
    width: "100%",
    height: "100%",
  },
  npcImageBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 2,
  },
  npcHpOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  npcHpTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 3,
    overflow: "hidden",
  },
  npcHpFill: { height: "100%", borderRadius: 3 },
  npcHpNum: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    minWidth: 50,
    textAlign: "right",
  },
  playerHpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hpLabelP: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.green, letterSpacing: 1, width: 28,
  },
  hpTrack: {
    flex: 1, height: 8,
    backgroundColor: Colors.game.border,
    borderRadius: 4, overflow: "hidden",
  },
  hpFill: { height: "100%", borderRadius: 4 },
  hpNum: {
    fontSize: 11, fontFamily: "Inter_500Medium",
    color: Colors.game.textDim, width: 55, textAlign: "right",
  },
  // ── Action bar ────────────────────────────────────────────────────────────
  actionBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBarLabel: {
    fontSize: 9, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 1.5, width: 42,
  },
  actionBarTrack: {
    flex: 1, height: 10,
    backgroundColor: "rgba(120,90,0,0.25)",
    borderRadius: 5, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(120,90,0,0.4)",
  },
  actionBarFill: { height: "100%", borderRadius: 5 },
  actionBarPct: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, width: 40, textAlign: "right",
  },
  actionBarPctReady: {
    color: Colors.game.gold,
  },
  // ── Stats strip ───────────────────────────────────────────────────────────
  statsStrip: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  statChip: {
    fontSize: 10, fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  statChipEnemy: {
    fontSize: 10, fontFamily: "Inter_500Medium",
  },
  log: {
    maxHeight: 80, backgroundColor: Colors.game.surface,
    borderRadius: 10, padding: 10,
  },
  logEmpty: {
    fontSize: 11, fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted, fontStyle: "italic", textAlign: "center",
  },
  logLine: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 2, lineHeight: 18 },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  atkBtn: {
    flex: 1,
    backgroundColor: Colors.game.red,
    borderRadius: 14, paddingVertical: 14,
    alignItems: "center",
  },
  atkBtnDisabled: {
    backgroundColor: Colors.game.surface,
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  atkBtnText: {
    fontSize: 17, fontFamily: "Inter_700Bold",
    color: "#fff", letterSpacing: 2,
  },
  atkBtnTextDisabled: {
    color: Colors.game.textMuted,
    fontSize: 17, letterSpacing: 4,
  },
  fleeBtn: {
    flex: 1,
    borderRadius: 14, paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.game.border,
    backgroundColor: Colors.game.surface,
  },
  fleeBtnText: {
    fontSize: 14, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 2,
  },
  resultRow: { alignItems: "center", gap: 8 },
  victoryText: {
    fontSize: 24, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 4,
  },
  defeatText: {
    fontSize: 24, fontFamily: "Inter_700Bold",
    color: Colors.game.red, letterSpacing: 4,
  },
  rewardText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.game.textDim },
  rewardChips: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  goldChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  goldCoin: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.game.gold,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#a07820",
  },
  goldCoinTxt: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#3d2e00" },
  rewardGoldTxt: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  xpChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  xpGem: {
    width: 18, height: 18, borderRadius: 4,
    backgroundColor: Colors.game.purple,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#6b21a8",
  },
  xpGemTxt: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#e9d5ff" },
  rewardXpTxt: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.game.purpleLight },
});
