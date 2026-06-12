import React, { useState } from "react";
import {
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const BANNER = require("@/assets/ui/banner.png");
const BANNER_AR = 2.64;

interface Props {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  size?: "sm" | "md" | "lg";
  /** kept for API compatibility — the ornate banner is always centered */
  align?: "left" | "center";
}

/**
 * Ornate ribbon banner heading: a carved gold cartouche (artwork) with a dark
 * engraved center plate. The banner is rendered at its natural aspect ratio
 * (sized as a fraction of the available width) so the scrollwork never
 * distorts, and the title is overlaid on the dark plate.
 */
export function BannerLabel({ title, icon, style, size = "md" }: Props) {
  const frac = size === "lg" ? 1 : size === "sm" ? 0.64 : 0.84;
  const fs = size === "lg" ? 16 : size === "sm" ? 11 : 13;
  const [w, setW] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const cw = e.nativeEvent.layout.width;
    if (cw && Math.abs(cw - w) > 1) setW(cw);
  };

  const bannerW = w * frac;
  const bannerH = bannerW / BANNER_AR;

  return (
    <View style={[styles.wrap, style]} onLayout={onLayout}>
      {w > 0 && (
        <View style={{ width: bannerW, height: bannerH }}>
          {/* box AR == image AR, so "stretch" fills exactly with no distortion */}
          <Image
            source={BANNER}
            resizeMode="stretch"
            style={{ width: bannerW, height: bannerH }}
          />
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            {icon && (
              <Ionicons
                name={icon}
                size={fs + 2}
                color={Colors.game.goldBright}
                style={styles.icon}
              />
            )}
            <Text
              style={[styles.title, { fontSize: fs }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {title.toUpperCase()}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: "21%",
  },
  icon: {
    marginRight: 6,
  },
  title: {
    fontFamily: "Inter_700Bold",
    color: Colors.game.goldBright,
    letterSpacing: 1.5,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
