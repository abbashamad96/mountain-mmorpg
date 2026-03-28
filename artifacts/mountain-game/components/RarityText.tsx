import React, { useEffect, useRef } from "react";
import { Animated, Text, TextStyle } from "react-native";
import { RARITY_COLORS, RarityName, VersionNum } from "@/context/GameContext";

const COSMIC_KEYFRAMES = ["#06B6D4", "#EF4444", "#22C55E", "#F59E0B", "#A855F7", "#06B6D4"];

interface RarityTextProps {
  rarity: RarityName;
  version?: VersionNum;
  label?: string;
  style?: TextStyle;
}

export function RarityText({ rarity, version, label, style }: RarityTextProps) {
  const colorAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (rarity === "Cosmic") {
      loopRef.current = Animated.loop(
        Animated.timing(colorAnim, {
          toValue: 5,
          duration: 2500,
          useNativeDriver: false,
        })
      );
      loopRef.current.start();
      return () => loopRef.current?.stop();
    }
  }, [rarity]);

  const vLabel = version && version > 0 ? ` T${version}` : "";
  const text = (label ?? rarity) + vLabel;

  if (rarity === "Cosmic") {
    const color = colorAnim.interpolate({
      inputRange: [0, 1, 2, 3, 4, 5],
      outputRange: COSMIC_KEYFRAMES,
    });
    return <Animated.Text style={[style, { color }]}>{text}</Animated.Text>;
  }

  return (
    <Text style={[style, { color: RARITY_COLORS[rarity] }]}>{text}</Text>
  );
}
