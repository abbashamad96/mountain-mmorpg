import React from "react";
import {
  Image,
  ImageBackground,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Colors from "@/constants/colors";

const DRAGONS = require("@/assets/ui/dragons.png");
const DIVIDER = require("@/assets/ui/divider.png");
const SLOT = require("@/assets/ui/slot.png");

const DRAGON_AR = 2.29;
const DIVIDER_AR = 3.89;

/** Twin-dragon heraldic crest — a hero emblem for headers. */
export function DragonCrest({
  width = 220,
  style,
}: {
  width?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={DRAGONS}
      style={[{ width, height: width / DRAGON_AR }, style]}
      resizeMode="contain"
    />
  );
}

/** Slim ornate filigree separator between sections. */
export function OrnateDivider({
  width,
  style,
}: {
  width?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={DIVIDER}
      style={[
        styles.divider,
        width ? { width, height: width / DIVIDER_AR } : { height: 40 },
        style,
      ]}
      resizeMode="contain"
    />
  );
}

/**
 * Ornate gold item slot frame with a dark inset center. Wrap an icon/child to
 * render it inside a carved inventory cell.
 */
export function OrnateSlot({
  size = 56,
  children,
  style,
}: {
  size?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <ImageBackground
      source={SLOT}
      resizeMode="stretch"
      style={[{ width: size, height: size }, style]}
    >
      <View style={styles.slotInner}>{children}</View>
    </ImageBackground>
  );
}

/**
 * Carved inventory cell: a rarity-tinted outer frame with an inset gold ring
 * and four corner rivets, evoking a riveted metal slot. The rarity color stays
 * on the outer border so item rarity is still readable at a glance.
 */
export function RivetFrame({
  color,
  size = 72,
  children,
  style,
}: {
  color: string;
  size?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.rivetOuter, { width: size, height: size, borderColor: color }, style]}>
      <View pointerEvents="none" style={styles.rivetInner} />
      {children}
      <View pointerEvents="none" style={[styles.rivet, styles.rivetTL]} />
      <View pointerEvents="none" style={[styles.rivet, styles.rivetTR]} />
      <View pointerEvents="none" style={[styles.rivet, styles.rivetBL]} />
      <View pointerEvents="none" style={[styles.rivet, styles.rivetBR]} />
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    width: "100%",
    alignSelf: "center",
  },
  slotInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: "16%",
  },
  rivetOuter: {
    borderRadius: 12,
    borderWidth: 2,
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.game.surface,
  },
  rivetInner: {
    position: "absolute",
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.5)",
  },
  rivet: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.game.goldBright,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
  },
  rivetTL: { top: 3, left: 3 },
  rivetTR: { top: 3, right: 3 },
  rivetBL: { bottom: 3, left: 3 },
  rivetBR: { bottom: 3, right: 3 },
});
