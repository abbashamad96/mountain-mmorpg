import React from "react";
import { Platform, Pressable, StyleSheet, Text, View, ViewStyle, TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = "gold" | "ruby" | "sapphire" | "emerald" | "amethyst" | "ember" | "dark";
type Size = "sm" | "md" | "lg";

const VARIANT_GRAD: Record<Variant, readonly [string, string, ...string[]]> = {
  gold: Colors.grad.goldButton,
  ruby: Colors.grad.ruby,
  sapphire: Colors.grad.sapphire,
  emerald: Colors.grad.emerald,
  amethyst: Colors.grad.amethyst,
  ember: Colors.grad.ember,
  dark: Colors.grad.panelHi,
};

const VARIANT_BORDER: Record<Variant, string> = {
  gold: Colors.game.goldBright,
  ruby: "#F0917F",
  sapphire: "#8FC8F5",
  emerald: "#9CE7B6",
  amethyst: "#D0B8FA",
  ember: "#FFC894",
  dark: Colors.game.gold,
};

const VARIANT_TEXT: Record<Variant, string> = {
  gold: "#3A2A0A",
  ruby: "#FFE6E0",
  sapphire: "#EAF4FF",
  emerald: "#E6FFEE",
  amethyst: "#F2EAFF",
  ember: "#3A1A06",
  dark: Colors.game.goldLight,
};

const SIZE_STYLE: Record<Size, { pv: number; ph: number; font: number; icon: number; radius: number }> = {
  sm: { pv: 8, ph: 12, font: 12, icon: 14, radius: 10 },
  md: { pv: 12, ph: 18, font: 14, icon: 18, radius: 12 },
  lg: { pv: 16, ph: 24, font: 17, icon: 22, radius: 14 },
};

interface Props {
  label?: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  glow?: boolean;
  testID?: string;
  children?: React.ReactNode;
}

export function FantasyButton({
  label,
  onPress,
  variant = "gold",
  size = "md",
  icon,
  iconRight = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
  glow = false,
  testID,
  children,
}: Props) {
  const scale = useSharedValue(1);
  const press = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glossStyle = useAnimatedStyle(() => ({
    opacity: 0.35 - press.value * 0.2,
  }));

  const sz = SIZE_STYLE[size];
  const grad = VARIANT_GRAD[variant];
  const txtColor = VARIANT_TEXT[variant];

  const handleIn = () => {
    scale.value = withTiming(0.94, { duration: 80 });
    press.value = withTiming(1, { duration: 80 });
  };
  const handleOut = () => {
    scale.value = withSequence(
      withTiming(1.03, { duration: 110 }),
      withTiming(1, { duration: 90 }),
    );
    press.value = withTiming(0, { duration: 160 });
  };
  const handlePress = () => {
    if (disabled) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress?.();
  };

  return (
    <AnimatedPressable
      testID={testID}
      onPressIn={handleIn}
      onPressOut={handleOut}
      onPress={handlePress}
      disabled={disabled}
      style={[
        animStyle,
        { borderRadius: sz.radius },
        fullWidth && { alignSelf: "stretch" },
        glow && styles.glowShadow,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={[styles.frame, { borderRadius: sz.radius, borderColor: VARIANT_BORDER[variant] }]}>
        <LinearGradient
          colors={grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.grad, { paddingVertical: sz.pv, paddingHorizontal: sz.ph, borderRadius: sz.radius - 1.5 }]}
        >
          {/* Top gloss highlight */}
          <Animated.View style={[styles.gloss, glossStyle]} pointerEvents="none">
            <LinearGradient
              colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {children ?? (
            <View style={styles.content}>
              {icon && !iconRight && <Ionicons name={icon} size={sz.icon} color={txtColor} />}
              {label != null && (
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                  style={[
                    styles.label,
                    { fontSize: sz.font, color: txtColor },
                    textStyle,
                  ]}
                >
                  {label}
                </Text>
              )}
              {icon && iconRight && <Ionicons name={icon} size={sz.icon} color={txtColor} />}
            </View>
          )}
        </LinearGradient>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1.5,
    overflow: "hidden",
  },
  grad: {
    overflow: "hidden",
  },
  gloss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  glowShadow: {
    shadowColor: Colors.game.gold,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  disabled: {
    opacity: 0.45,
  },
});
