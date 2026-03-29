import * as Haptics from "expo-haptics";
import React from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { CharacterStats, useGame } from "@/context/GameContext";

interface StatAllocModalProps {
  visible: boolean;
  onClose: () => void;
  pendingPoints: number;
  stats: CharacterStats;
}

const OPTIONS: {
  key: keyof CharacterStats;
  label: string;
  icon: string;
  color: string;
  bonus: string;
}[] = [
  { key: "strength", label: "Strength", icon: "⚔", color: Colors.game.red, bonus: "+1 STR" },
  { key: "health", label: "Health", icon: "♥", color: Colors.game.green, bonus: "+10 HP" },
  { key: "defence", label: "Defence", icon: "🛡", color: Colors.game.blue, bonus: "+1 DEF" },
  { key: "speed", label: "Speed", icon: "⚡", color: Colors.game.gold, bonus: "+1 SPD" },
];

export function StatAllocModal({ visible, onClose, pendingPoints, stats }: StatAllocModalProps) {
  const { allocateStat } = useGame();

  function handleAlloc(key: keyof CharacterStats) {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    allocateStat(key);
  }

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>LEVEL UP</Text>
          <Text style={styles.sub}>
            {pendingPoints} stat point{pendingPoints !== 1 ? "s" : ""} available
          </Text>

          <View style={styles.grid}>
            {OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
                onPress={() => handleAlloc(opt.key)}
              >
                <Text style={styles.btnIcon}>{opt.icon}</Text>
                <Text style={[styles.btnLabel, { color: opt.color }]}>{opt.label}</Text>
                <Text style={styles.btnCurrent}>{stats[opt.key]}</Text>
                <Text style={[styles.btnBonus, { color: opt.color }]}>{opt.bonus}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.laterBtn} onPress={onClose}>
            <Text style={styles.laterText}>Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.game.gold,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
    letterSpacing: 5,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    width: "100%",
  },
  btn: {
    width: "47%",
    backgroundColor: Colors.game.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  btnPressed: {
    backgroundColor: Colors.game.background,
    borderColor: Colors.game.gold,
  },
  btnIcon: { fontSize: 22 },
  btnLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  btnCurrent: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.game.text,
  },
  btnBonus: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  laterBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  laterText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textMuted,
  },
});
