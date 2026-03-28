import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { CharacterStats, NpcBattleStats, RARITY_COLORS } from "@/context/GameContext";
import { RarityText } from "./RarityText";

interface BattleModalProps {
  visible: boolean;
  npc: NpcBattleStats | null;
  playerStats: CharacterStats;
  onComplete: (victory: boolean, goldReward: number, xpReward: number) => void;
}

type BattlePhase = "intro" | "fighting" | "victory" | "defeat";

interface LogLine {
  id: number;
  text: string;
  color: string;
}

let lineId = 0;

export function BattleModal({ visible, npc, playerStats, onComplete }: BattleModalProps) {
  const [phase, setPhase] = useState<BattlePhase>("intro");
  const [playerHp, setPlayerHp] = useState(0);
  const [npcHp, setNpcHp] = useState(0);
  const [log, setLog] = useState<LogLine[]>([]);
  const [playerTurn, setPlayerTurn] = useState(true);
  const [cooldown, setCooldown] = useState(false);

  const playerHpRef = useRef(0);
  const npcHpRef = useRef(0);
  const phaseRef = useRef<BattlePhase>("intro");
  const npcRef = useRef(npc);
  npcRef.current = npc;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
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

  function runFlash(color: "gold" | "red") {
    flashAnim.setValue(0.4);
    Animated.timing(flashAnim, { toValue: 0, duration: 350, useNativeDriver: false }).start();
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

  useEffect(() => {
    if (visible && npc) {
      const maxHp = playerStats.health;
      playerHpRef.current = maxHp;
      npcHpRef.current = npc.hp;
      phaseRef.current = "intro";
      setPlayerHp(maxHp);
      setNpcHp(npc.hp);
      setLog([]);
      setCooldown(false);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 90, friction: 8 }),
      ]).start(() => {
        phaseRef.current = "fighting";
        setPhase("fighting");
        const pFirst = playerStats.speed >= npc.spd;
        setPlayerTurn(pFirst);
        if (pFirst) {
          addLine("You move first — attack!", Colors.game.gold);
          startPulse();
        } else {
          addLine(`${npc.name} strikes first!`, Colors.game.red);
          setTimeout(() => npcAttackTurn(maxHp), 700);
        }
      });
    }
    return () => {
      stopPulse();
    };
  }, [visible]);

  function calcPlayerDmg() {
    const base = playerStats.strength;
    return Math.max(1, base + Math.floor(Math.random() * Math.max(1, base * 0.4)));
  }

  function calcNpcDmg() {
    if (!npcRef.current) return 1;
    const raw = npcRef.current.atk + Math.floor(Math.random() * Math.max(1, npcRef.current.atk * 0.35));
    return Math.max(1, raw - Math.floor(playerStats.defence * 0.4));
  }

  function npcAttackTurn(currentPlayerHp: number) {
    if (phaseRef.current !== "fighting") return;
    const dmg = calcNpcDmg();
    const newHp = Math.max(0, currentPlayerHp - dmg);
    playerHpRef.current = newHp;
    setPlayerHp(newHp);
    runShake(playerShakeAnim);
    runFlash("red");
    const name = npcRef.current?.name ?? "Enemy";
    addLine(`${name} hits you for ${dmg} damage!`, Colors.game.red);

    if (newHp <= 0) {
      phaseRef.current = "defeat";
      setPhase("defeat");
      addLine("You were defeated! Retreating...", Colors.game.red);
      setTimeout(() => closeModal(false), 1400);
    } else {
      setPlayerTurn(true);
      startPulse();
    }
  }

  const handleAttack = useCallback(() => {
    if (!npcRef.current || cooldown || phaseRef.current !== "fighting" || !playerTurn) return;
    stopPulse();
    setCooldown(true);
    setPlayerTurn(false);

    const dmg = calcPlayerDmg();
    const newNpcHp = Math.max(0, npcHpRef.current - dmg);
    npcHpRef.current = newNpcHp;
    setNpcHp(newNpcHp);
    runShake(npcShakeAnim);
    runFlash("gold");
    addLine(`You strike for ${dmg} damage!`, Colors.game.gold);

    if (newNpcHp <= 0) {
      phaseRef.current = "victory";
      setPhase("victory");
      const g = npcRef.current.goldReward;
      const x = npcRef.current.xpReward;
      addLine(`${npcRef.current.name} defeated! +${g}g +${x}xp`, Colors.game.green);
      setTimeout(() => closeModal(true), 1400);
      setCooldown(false);
      return;
    }

    setTimeout(() => {
      if (phaseRef.current !== "fighting") { setCooldown(false); return; }
      npcAttackTurn(playerHpRef.current);
      setCooldown(false);
    }, 650);
  }, [cooldown, playerTurn]);

  function closeModal(victory: boolean) {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 280, useNativeDriver: true }),
    ]).start(() => {
      const n = npcRef.current;
      onComplete(victory, victory && n ? n.goldReward : 0, victory && n ? n.xpReward : 0);
    });
  }

  if (!npc) return null;

  const pHpPct = Math.max(0, (playerHp / playerStats.health) * 100);
  const nHpPct = Math.max(0, (npcHp / npc.maxHp) * 100);
  const rarityColor = RARITY_COLORS[npc.rarity];
  const flashColor = flashAnim.interpolate({ inputRange: [0, 0.4], outputRange: ["rgba(0,0,0,0)", "#EF4444"] });

  return (
    <Modal transparent visible={visible} animationType="none">
      {/* Screen flash */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: flashColor, zIndex: 1 }]}
        pointerEvents="none"
      />
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
        >
          {/* Title */}
          <View style={styles.titleRow}>
            <Text style={styles.battleLabel}>⚔ BATTLE</Text>
            <RarityText rarity={npc.rarity} version={npc.version} label={npc.name} style={styles.npcName} />
          </View>

          {/* HP Bars */}
          <View style={styles.hpBlock}>
            <Animated.View style={[styles.hpRow, { transform: [{ translateX: playerShakeAnim }] }]}>
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
              <Text style={styles.hpNum}>{playerHp}/{playerStats.health}</Text>
            </Animated.View>

            <Animated.View style={[styles.hpRow, { transform: [{ translateX: npcShakeAnim }] }]}>
              <Text style={[styles.hpLabelN, { color: rarityColor }]}>FOE</Text>
              <View style={styles.hpTrack}>
                <View style={[styles.hpFill, { width: `${nHpPct}%` as any, backgroundColor: rarityColor }]} />
              </View>
              <Text style={[styles.hpNum, { color: rarityColor }]}>{npcHp}/{npc.maxHp}</Text>
            </Animated.View>
          </View>

          {/* Speed indicator */}
          <View style={styles.speedRow}>
            <Text style={styles.speedChip}>
              ⚡ {playerStats.speed}{" "}
              {playerStats.speed >= npc.spd ? (
                <Text style={{ color: Colors.game.green }}>▲</Text>
              ) : (
                <Text style={{ color: Colors.game.red }}>▼</Text>
              )}{" "}
              {npc.spd} ⚡
            </Text>
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

          {/* Action button */}
          {phase === "fighting" && playerTurn && !cooldown && (
            <Animated.View style={{ transform: [{ scale: attackPulse }] }}>
              <Pressable style={styles.atkBtn} onPress={handleAttack}>
                <Text style={styles.atkBtnText}>⚔  ATTACK</Text>
              </Pressable>
            </Animated.View>
          )}
          {phase === "fighting" && (!playerTurn || cooldown) && (
            <View style={styles.waitBtn}>
              <Text style={styles.waitText}>• • •</Text>
            </View>
          )}
          {phase === "victory" && (
            <View style={styles.resultRow}>
              <Text style={styles.victoryText}>VICTORY!</Text>
              <Text style={styles.rewardText}>+{npc.goldReward} Gold  +{npc.xpReward} XP</Text>
            </View>
          )}
          {phase === "defeat" && (
            <View style={styles.resultRow}>
              <Text style={styles.defeatText}>DEFEATED</Text>
              <Text style={styles.rewardText}>You retreat safely.</Text>
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
    gap: 12,
  },
  titleRow: { alignItems: "center", gap: 4 },
  battleLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 4,
  },
  npcName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  hpBlock: { gap: 8 },
  hpRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hpLabelP: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.green, letterSpacing: 1, width: 28,
  },
  hpLabelN: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    letterSpacing: 1, width: 28,
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
  speedRow: { alignItems: "center" },
  speedChip: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    color: Colors.game.textDim,
  },
  log: {
    maxHeight: 100, backgroundColor: Colors.game.surface,
    borderRadius: 10, padding: 10,
  },
  logEmpty: {
    fontSize: 11, fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted, fontStyle: "italic", textAlign: "center",
  },
  logLine: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 2, lineHeight: 18 },
  atkBtn: {
    backgroundColor: Colors.game.red,
    borderRadius: 14, paddingVertical: 14,
    alignItems: "center",
  },
  atkBtnText: {
    fontSize: 17, fontFamily: "Inter_700Bold",
    color: "#fff", letterSpacing: 2,
  },
  waitBtn: {
    backgroundColor: Colors.game.surface,
    borderRadius: 14, paddingVertical: 14,
    alignItems: "center", borderWidth: 1, borderColor: Colors.game.border,
  },
  waitText: {
    fontSize: 17, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 4,
  },
  resultRow: { alignItems: "center", gap: 4 },
  victoryText: {
    fontSize: 24, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 4,
  },
  defeatText: {
    fontSize: 24, fontFamily: "Inter_700Bold",
    color: Colors.game.red, letterSpacing: 4,
  },
  rewardText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.game.textDim },
});
