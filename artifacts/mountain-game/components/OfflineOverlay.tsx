import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

export function OfflineOverlay() {
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      hardwareAccelerated
    >
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name="wifi-off" size={36} color={Colors.game.textMuted} />
          </View>
          <Text style={styles.heading}>No Internet Connection</Text>
          <Text style={styles.sub}>Reconnecting…</Text>
          <ActivityIndicator
            size="small"
            color={Colors.game.gold}
            style={styles.spinner}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(6,4,14,0.93)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 40,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.game.border,
    maxWidth: 320,
    width: "85%",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heading: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.game.text,
    letterSpacing: 0.4,
    textAlign: "center",
  },
  sub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted,
    textAlign: "center",
  },
  spinner: {
    marginTop: 8,
  },
});
