import React, { useEffect, useRef } from "react";
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
import { BattleResult } from "@/context/MultiplayerContext";

interface BattleModalProps {
  result: BattleResult | null;
  onClose: () => void;
}

export function BattleModal({ result, onClose }: BattleModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (result) {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [result]);

  if (!result) return null;

  const won = result.won;
  const headerColor = won ? Colors.game.gold : Colors.game.textMuted;
  const headerText = won ? "VICTORY" : "DEFEAT";

  return (
    <Modal transparent visible={!!result} animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: headerColor }]}>
            <Text style={[styles.headerText, { color: headerColor }]}>
              {headerText}
            </Text>
            <Text style={styles.vsText}>
              vs{" "}
              <Text style={styles.opponentName}>
                {result.opponentName} (Lv.{result.opponentLevel})
              </Text>
            </Text>
          </View>

          <ScrollView
            style={styles.logScroll}
            showsVerticalScrollIndicator={false}
          >
            {result.log.map((line, i) => (
              <Text key={i} style={styles.logLine}>
                {line}
              </Text>
            ))}
            {won && result.hpRemaining > 0 && (
              <Text style={styles.survivedLine}>
                Survived with {result.hpRemaining} HP remaining
              </Text>
            )}
          </ScrollView>

          <Pressable
            style={[
              styles.closeBtn,
              { backgroundColor: won ? Colors.game.gold : Colors.game.surface },
            ]}
            onPress={onClose}
          >
            <Text
              style={[
                styles.closeBtnText,
                { color: won ? Colors.game.background : Colors.game.textDim },
              ]}
            >
              {won ? "Claim Victory" : "Accept Defeat"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.game.border,
    maxHeight: 420,
  },
  header: {
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  headerText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
  },
  vsText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    marginTop: 4,
  },
  opponentName: {
    color: Colors.game.text,
    fontFamily: "Inter_600SemiBold",
  },
  logScroll: {
    maxHeight: 180,
    marginBottom: 16,
  },
  logLine: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.game.border,
  },
  survivedLine: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.green,
    paddingVertical: 6,
  },
  closeBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
