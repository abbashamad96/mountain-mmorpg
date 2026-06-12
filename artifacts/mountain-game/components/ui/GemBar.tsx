import React, { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Colors from "@/constants/colors";

type Gem = "ruby" | "sapphire" | "emerald" | "amethyst" | "gold" | "ember";

const GEM_GRAD: Record<Gem, readonly [string, string, ...string[]]> = {
  ruby: Colors.grad.ruby,
  sapphire: Colors.grad.sapphire,
  emerald: Colors.grad.emerald,
  amethyst: Colors.grad.amethyst,
  gold: Colors.grad.gold,
  ember: Colors.grad.ember,
};

const STUD: Record<Gem, string> = {
  ruby: Colors.game.redLight,
  sapphire: Colors.game.blueLight,
  emerald: Colors.game.greenLight,
  amethyst: Colors.game.purpleLight,
  gold: Colors.game.goldBright,
  ember: Colors.game.emberLight,
};

interface Props {
  /** 0..1 */
  progress: number;
  gem?: Gem;
  height?: number;
  style?: ViewStyle;
  animated?: boolean;
  /** show the gold frame + faceted end gems (default true) */
  framed?: boolean;
}

/**
 * Gem-cut progress bar in a gold setting: a molten gradient fill with a glossy
 * top highlight, framed by a gold bevel with faceted gem studs at each end —
 * echoing the ruby/sapphire status bars from the reference art.
 */
export function GemBar({
  progress,
  gem = "gold",
  height = 10,
  style,
  animated = true,
  framed = true,
}: Props) {
  const pct = Math.max(0, Math.min(1, progress));
  const w = useSharedValue(pct);

  useEffect(() => {
    if (animated) {
      w.value = withTiming(pct, { duration: 480, easing: Easing.out(Easing.cubic) });
    } else {
      w.value = pct;
    }
  }, [pct, animated]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${w.value * 100}%`,
  }));

  const r = height / 2;
  const studSize = height + 4;

  const track = (
    <View style={[styles.track, { height, borderRadius: r }]}>
      <Animated.View style={[styles.fillWrap, { borderRadius: r }, fillStyle]}>
        <LinearGradient
          colors={GEM_GRAD[gem]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: r }]}
        />
        {/* glossy top highlight */}
        <LinearGradient
          colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.gloss, { height: r, borderRadius: r }]}
        />
      </Animated.View>
    </View>
  );

  if (!framed) {
    return <View style={[{ borderRadius: r }, style]}>{track}</View>;
  }

  return (
    <View style={[styles.outer, style]}>
      <LinearGradient
        colors={[Colors.game.goldLight, Colors.game.goldDark, Colors.game.goldDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.frame, { borderRadius: r + 2.5 }]}
      >
        {track}
      </LinearGradient>
      {/* faceted end gems */}
      <View
        style={[
          styles.stud,
          {
            width: studSize,
            height: studSize,
            left: -studSize / 2.6,
            backgroundColor: STUD[gem],
            transform: [{ translateY: -studSize / 2 }, { rotate: "45deg" }],
          },
        ]}
      />
      <View
        style={[
          styles.stud,
          {
            width: studSize,
            height: studSize,
            right: -studSize / 2.6,
            backgroundColor: STUD[gem],
            transform: [{ translateY: -studSize / 2 }, { rotate: "45deg" }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    justifyContent: "center",
  },
  frame: {
    padding: 2,
  },
  track: {
    backgroundColor: "#0A0610",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.55)",
    overflow: "hidden",
    flex: 1,
  },
  fillWrap: {
    height: "100%",
    overflow: "hidden",
  },
  gloss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  stud: {
    position: "absolute",
    top: "50%",
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: Colors.game.goldBright,
  },
});
