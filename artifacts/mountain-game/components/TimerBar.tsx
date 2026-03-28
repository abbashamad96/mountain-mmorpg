import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

interface TimerBarProps {
  isActive: boolean;
  duration: number;
}

export function TimerBar({ isActive, duration }: TimerBarProps) {
  const progress = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    animRef.current?.stop();
    if (isActive) {
      progress.setValue(0);
      animRef.current = Animated.timing(progress, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      });
      animRef.current.start();
    } else {
      progress.setValue(1);
    }
  }, [isActive, duration]);

  const barColor = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [Colors.game.red, Colors.game.gold, Colors.game.green],
  });

  const readyOpacity = progress.interpolate({
    inputRange: [0.92, 1],
    outputRange: [0, 1],
  });

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.row}>
      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { width: barWidth as any, backgroundColor: barColor }]}
        />
      </View>
      <Animated.Text style={[styles.label, { opacity: readyOpacity }]}>
        READY
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 2,
  },
  track: {
    flex: 1,
    height: 5,
    backgroundColor: Colors.game.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.green,
    letterSpacing: 1.5,
    width: 42,
    textAlign: "right",
  },
});
