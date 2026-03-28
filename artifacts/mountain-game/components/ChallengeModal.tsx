import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { IncomingChallenge } from "@/context/MultiplayerContext";

interface ChallengeModalProps {
  challenge: IncomingChallenge | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function ChallengeModal({
  challenge,
  onAccept,
  onDecline,
}: ChallengeModalProps) {
  if (!challenge) return null;

  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.icon}>
            <Text style={styles.iconText}>⚔</Text>
          </View>
          <Text style={styles.title}>Challenge Received</Text>
          <Text style={styles.desc}>
            <Text style={styles.name}>{challenge.fromName}</Text>
            {" (Lv."}
            <Text style={styles.name}>{challenge.fromLevel}</Text>
            {") "} wants to battle!
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{challenge.fromStats.strength}</Text>
              <Text style={styles.statLabel}>STR</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{challenge.fromStats.health}</Text>
              <Text style={styles.statLabel}>HP</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{challenge.fromStats.defence}</Text>
              <Text style={styles.statLabel}>DEF</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{challenge.fromStats.speed}</Text>
              <Text style={styles.statLabel}>SPD</Text>
            </View>
          </View>

          <View style={styles.btnRow}>
            <Pressable style={styles.declineBtn} onPress={onDecline}>
              <Text style={styles.declineBtnText}>Decline</Text>
            </Pressable>
            <Pressable style={styles.acceptBtn} onPress={onAccept}>
              <Text style={styles.acceptBtnText}>Fight!</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
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
    borderColor: Colors.game.border,
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.game.surface,
    borderWidth: 1,
    borderColor: Colors.game.gold,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.game.text,
    marginBottom: 6,
  },
  desc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    textAlign: "center",
    marginBottom: 16,
  },
  name: {
    color: Colors.game.gold,
    fontFamily: "Inter_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
    backgroundColor: Colors.game.surface,
    borderRadius: 12,
    padding: 12,
    width: "100%",
    justifyContent: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statVal: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  declineBtn: {
    flex: 1,
    backgroundColor: Colors.game.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  declineBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.textDim,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: Colors.game.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  acceptBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.game.background,
  },
});
