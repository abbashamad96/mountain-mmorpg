import React from "react";
import { Image, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

const CORNER = require("@/assets/ui/corner.png");

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  variant?: "default" | "raised";
  accent?: string;
  glow?: boolean;
  corners?: boolean;
  /** size of the corner filigree art, px */
  cornerSize?: number;
  padding?: number;
}

/**
 * Carved fantasy panel: a layered gold frame with a gradient interior, engraved
 * gold corner filigree (artwork) and an optional ambient glow. Base container
 * used across the whole UI.
 */
export function OrnatePanel({
  children,
  style,
  contentStyle,
  variant = "default",
  accent = Colors.game.gold,
  glow = false,
  corners = true,
  cornerSize = 46,
  padding = 14,
}: Props) {
  const grad = variant === "raised" ? Colors.grad.panelHi : Colors.grad.panel;

  return (
    <View style={[styles.outer, glow && styles.glow, style]}>
      <LinearGradient
        colors={[Colors.game.goldLight, Colors.game.goldDark, Colors.game.goldDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.frame}
      >
        <LinearGradient
          colors={[Colors.game.goldDeep, "#2A1F12"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.bevel}
        >
          <LinearGradient
            colors={grad}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[styles.inner, { padding }, contentStyle]}
          >
            {/* top inner highlight */}
            <LinearGradient
              colors={["rgba(255,233,160,0.10)", "rgba(255,233,160,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.topSheen}
              pointerEvents="none"
            />
            {children}
            {corners && (
              <View style={styles.cornerLayer} pointerEvents="none">
                <Image
                  source={CORNER}
                  style={[styles.corner, styles.tl, { width: cornerSize, height: cornerSize }]}
                  resizeMode="contain"
                />
                <Image
                  source={CORNER}
                  style={[
                    styles.corner,
                    styles.tr,
                    { width: cornerSize, height: cornerSize, transform: [{ rotate: "90deg" }] },
                  ]}
                  resizeMode="contain"
                />
                <Image
                  source={CORNER}
                  style={[
                    styles.corner,
                    styles.br,
                    { width: cornerSize, height: cornerSize, transform: [{ rotate: "180deg" }] },
                  ]}
                  resizeMode="contain"
                />
                <Image
                  source={CORNER}
                  style={[
                    styles.corner,
                    styles.bl,
                    { width: cornerSize, height: cornerSize, transform: [{ rotate: "270deg" }] },
                  ]}
                  resizeMode="contain"
                />
              </View>
            )}
          </LinearGradient>
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 18,
  },
  glow: {
    shadowColor: Colors.game.gold,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  frame: {
    borderRadius: 18,
    padding: 2.5,
  },
  bevel: {
    borderRadius: 16,
    padding: 1.5,
  },
  inner: {
    borderRadius: 14.5,
    overflow: "hidden",
    position: "relative",
  },
  topSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
  },
  cornerLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  corner: {
    position: "absolute",
    opacity: 0.95,
  },
  tl: { top: -2, left: -2 },
  tr: { top: -2, right: -2 },
  br: { bottom: -2, right: -2 },
  bl: { bottom: -2, left: -2 },
});
