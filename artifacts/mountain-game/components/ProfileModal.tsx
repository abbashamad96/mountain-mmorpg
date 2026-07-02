import React, { useState, useEffect } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { FantasyButton, GemBar } from "@/components/ui";
import { useGame, getEffectiveStats, CharacterStats, Character, GameState } from "@/context/GameContext";
import { useMultiplayer } from "@/context/MultiplayerContext";
import { CRAFTING_MAX_ENERGY, CRAFTING_ENERGY_REGEN_MS } from "@/lib/crafting";

const STAT_CONFIG = [
  { key: "strength" as const, label: "Strength", icon: "\u2694", color: Colors.game.red, desc: "Damage per hit \u00b7 +0.25 per level", bonus: "+1 STR" },
  { key: "health" as const, label: "Health", icon: "\u2665", color: Colors.game.green, desc: "HP points \u00b7 +0.1 per level \u00b7 max HP = pts \u00d7 10", bonus: "+10 HP" },
  { key: "defence" as const, label: "Defence", icon: "\u{1F6E1}", color: Colors.game.blue, desc: "Increases block chance", bonus: "+1 def" },
  { key: "speed" as const, label: "Speed", icon: "\u26a1", color: Colors.game.gold, desc: "Higher speed = more turns \u00b7 +0.1 per level", bonus: "+1 SPD" },
];

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

function ProfileContent({ char, gameState }: { char: Character; gameState: GameState }) {
  const { allocateStat } = useGame();
  const { yourId, playerName, logout, saveGameState } = useMultiplayer();
  const effective = getEffectiveStats(char);
  const maxEnergy = CRAFTING_MAX_ENERGY + char.energyLimitExtender;
  const xpPct = char.xpToNext > 0 ? Math.min(1, char.xp / char.xpToNext) : 1;
  const isLoggedIn = !!yourId;

  // Live timer that ticks every second
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const msUntil = char.energyLastRegen + CRAFTING_ENERGY_REGEN_MS - Date.now();
  const secs = Math.max(0, Math.ceil(msUntil / 1000));
  const m = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, "0");
  const energyRegenLabel = char.craftingEnergy >= maxEnergy ? "Full" : `+1 in ${m}:${ss}`;

  return (
    <View style={{ gap: 14 }}>
      {/* Level & Name */}
      <View style={{ alignItems: "center", gap: 4 }}>
        <Text style={styles.nameLabel}>WANDERER</Text>
        <View style={styles.levelRow}>
          <Text style={styles.lvLabel}>LV </Text>
          <Text style={styles.lvValue}>{char.level}</Text>
        </View>
      </View>

      {/* XP Bar */}
      <View style={styles.xpRow}>
        <View style={styles.xpGem}>
          <Text style={styles.xpGemText}>XP</Text>
        </View>
        <View style={styles.xpTrack}>
          <GemBar progress={xpPct} gem="sapphire" height={8} />
        </View>
        <Text style={styles.xpNums}>{char.xp}/{char.xpToNext}</Text>
      </View>

      {/* Gold & Rubies */}
      <View style={styles.goldBlock}>
        <View style={styles.goldCoin}>
          <Text style={styles.goldCoinText}>G</Text>
        </View>
        <Text style={styles.goldVal}>{char.gold.toLocaleString()} Gold</Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#E91E8C" }}>
          {char.rubies} Rubies
        </Text>
      </View>

      {/* Energy */}
      <View style={styles.onlineRow}>
        <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.game.ember }}>
          {char.craftingEnergy}/{maxEnergy} Energy
        </Text>
        <Text style={styles.onlineStatus}>{energyRegenLabel}</Text>
      </View>

      {/* Lifetime stats */}
      <View style={styles.lifetimeRow}>
        <View style={styles.lifetimeStat}>
          <Text style={styles.lifetimeVal}>{gameState.totalEvents.toLocaleString()}</Text>
          <Text style={styles.lifetimeLabel}>Total Events</Text>
        </View>
        <View style={styles.lifetimeDivider} />
        <View style={styles.lifetimeStat}>
          <Text style={styles.lifetimeVal}>{gameState.enemiesDefeated.toLocaleString()}</Text>
          <Text style={styles.lifetimeLabel}>Enemies Defeated</Text>
        </View>
      </View>

      {/* Account */}
      <View style={styles.accountCard}>
        <Text style={styles.accountLabel}>ACCOUNT</Text>
        <View style={styles.accountRow}>
          <Text style={styles.accountValue}>{isLoggedIn ? (playerName || yourId) : "Guest"}</Text>
          <Pressable style={styles.accountActionBtn} onPress={() => {
            saveGameState?.(gameState);
          }}>
            <Text style={styles.accountActionTxt}>SAVE</Text>
          </Pressable>
        </View>
        {isLoggedIn && (
          <Pressable style={[styles.accountActionBtn, styles.logoutBtn]} onPress={logout}>
            <Text style={[styles.accountActionTxt, { color: Colors.game.red }]}>LOGOUT</Text>
          </Pressable>
        )}
      </View>

      {/* Stat Points */}
      {char.pendingStatPoints > 0 && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingText}>{char.pendingStatPoints} stat points available</Text>
        </View>
      )}

      {/* Stats Grid with Allocate buttons */}
      <View style={styles.statGrid}>
        {STAT_CONFIG.map((s) => (
          <View key={s.key} style={styles.statCard}>
            <View style={styles.statCardTop}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <View style={styles.statInfo}>
                <Text style={[styles.statName, { color: s.color }]}>{s.label}</Text>
                <Text style={styles.statDesc}>{s.desc}</Text>
              </View>
              <Text style={[styles.statVal, { color: s.color }]}>
                {effective[s.key].toFixed(1)}
              </Text>
            </View>
            {char.pendingStatPoints > 0 && (
              <Pressable
                style={styles.allocBtn}
                onPress={() => allocateStat(s.key)}
              >
                <Text style={[styles.allocBtnText, { color: s.color }]}>
                  ALLOCATE {s.bonus}
                </Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const { gameState } = useGame();
  const char = gameState.character;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={Colors.grad.panel}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.sheet}
        >
          <View style={styles.handle} />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <ProfileContent char={char} gameState={gameState} />
          </ScrollView>

          <FantasyButton
            style={styles.closeBtn}
            size="md"
            fullWidth
            variant="dark"
            icon="close"
            label="CLOSE"
            onPress={onClose}
          />
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(7,4,9,0.8)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.game.gold + "55",
  },
  handle: {
    width: 44, height: 4,
    backgroundColor: Colors.game.gold + "66",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  nameLabel: {
    fontSize: 10, fontFamily: "Inter_600SemiBold",
    color: Colors.game.textMuted, letterSpacing: 2,
  },
  levelRow: { flexDirection: "row", alignItems: "baseline" },
  lvLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
  lvValue: { fontSize: 34, fontFamily: "Inter_700Bold", color: Colors.game.gold, lineHeight: 38 },
  xpRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  xpGem: {
    width: 18, height: 18, borderRadius: 4,
    backgroundColor: Colors.game.purple,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#6b21a8",
  },
  xpGemText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#e9d5ff" },
  xpTrack: { flex: 1 },
  xpNums: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.game.textMuted },
  goldBlock: { flexDirection: "row", alignItems: "center", gap: 7 },
  goldCoin: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.game.gold,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#a07820",
  },
  goldCoinText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#3d2e00" },
  goldVal: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  onlineRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginBottom: 12, paddingVertical: 8,
    paddingHorizontal: 12, borderRadius: 12,
    backgroundColor: Colors.game.surface,
    borderWidth: 1, borderColor: Colors.game.gold + "22",
  },
  onlineStatus: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.game.textDim },
  lifetimeRow: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 12, borderRadius: 12,
    backgroundColor: Colors.game.surface,
    borderWidth: 1, borderColor: Colors.game.gold + "22",
    overflow: "hidden",
  },
  lifetimeStat: { flex: 1, alignItems: "center", paddingVertical: 12, gap: 3 },
  lifetimeDivider: { width: 1, height: "100%", backgroundColor: Colors.game.border },
  lifetimeVal: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  lifetimeLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.game.textMuted, letterSpacing: 0.5 },
  pendingBanner: {
    backgroundColor: "rgba(128,96,192,0.15)",
    borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: Colors.game.purple,
    alignItems: "center", marginBottom: 6,
  },
  pendingText: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.game.purpleLight },
  statGrid: { gap: 10, marginBottom: 16 },
  statCard: {
    backgroundColor: Colors.game.surface,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.game.gold + "22", gap: 8,
  },
  statCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  statIcon: { fontSize: 20 },
  statInfo: { flex: 1 },
  statName: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statDesc: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },
  statVal: { fontSize: 26, fontFamily: "Inter_700Bold" },
  allocBtn: {
    borderWidth: 1, borderRadius: 8,
    paddingVertical: 7, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: Colors.game.border,
  },
  allocBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  accountCard: {
    backgroundColor: Colors.game.surface,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.game.gold + "22", gap: 8,
    marginTop: 6,
  },
  accountLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.game.textMuted, letterSpacing: 2 },
  accountRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  accountValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.game.text },
  accountActionBtn: {
    borderRadius: 8, borderWidth: 1,
    borderColor: Colors.game.border,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  logoutBtn: { alignSelf: "flex-start", marginTop: 4 },
  accountActionTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.game.textDim },
  closeBtn: { marginTop: 10 },
});
