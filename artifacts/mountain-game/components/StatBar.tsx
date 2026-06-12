import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

interface StatBarProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

export function StatBar({ label, value, color, icon }: StatBarProps) {
  const displayWidth = Math.min(100, (value / 50) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>{value}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${displayWidth}%` as any }]}>
          <LinearGradient
            colors={[color, color]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gloss}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  icon: {
    fontSize: 12,
    marginRight: 4,
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  barBg: {
    height: 6,
    backgroundColor: "#0A0610",
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.5)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
    overflow: "hidden",
  },
  gloss: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: "50%",
  },
});
