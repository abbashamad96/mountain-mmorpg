import React, { useEffect, useRef } from "react";
import {
  Animated as RNAnimated,
  Image,
  ImageSourcePropType,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { SceneType } from "@/context/GameContext";
import { FantasyButton } from "./ui";

// ── Full background image pool ────────────────────────────────────────────────
const BG_IMAGES: ImageSourcePropType[] = [
  require("@/assets/images/road_default.png"),
  require("@/assets/images/road_storm.png"),
  require("@/assets/images/road_treasure.png"),
  require("@/assets/images/road_combat.png"),
  require("@/assets/images/road_ruins.png"),
  require("@/assets/images/road_forest.png"),
  require("@/assets/images/road_snow.png"),
  require("@/assets/images/road_dungeon.png"),
  require("@/assets/images/road_volcanic.png"),
  require("@/assets/images/road_night.png"),
  require("@/assets/images/road_crystal.png"),
  require("@/assets/images/road_temple.png"),
  require("@/assets/images/road_desert.png"),
  require("@/assets/images/road_graveyard.png"),
  require("@/assets/images/road_tundra.png"),
  require("@/assets/images/road_mist.png"),
  require("@/assets/images/road_swamp.png"),
  require("@/assets/images/road_void.png"),
  require("@/assets/images/road_clockwork.png"),
  require("@/assets/images/road_bloodmoon.png"),
  require("@/assets/images/road_waterfall.png"),
  require("@/assets/images/road_mushroom.png"),
  require("@/assets/images/road_lavafield.png"),
  require("@/assets/images/road_pinewood.png"),
  require("@/assets/images/road_abyss.png"),
  require("@/assets/images/road_castle.png"),
  require("@/assets/images/road_cliff.png"),
  require("@/assets/images/road_glowcave.png"),
  require("@/assets/images/road_oasis.png"),
  require("@/assets/images/road_peak.png"),
];

export const BG_IMAGES_COUNT = BG_IMAGES.length;

const SCENE_TINT: Record<SceneType, string> = {
  default: "transparent",
  storm: "rgba(30,60,140,0.3)",
  treasure: "rgba(160,120,0,0.2)",
  combat: "rgba(160,20,20,0.35)",
  ruins: "rgba(80,60,30,0.3)",
  forest: "rgba(10,80,20,0.35)",
  snow: "rgba(180,210,255,0.3)",
  dungeon: "rgba(60,10,100,0.45)",
  volcanic: "rgba(200,60,10,0.35)",
  night: "rgba(5,5,40,0.55)",
};

const SCENE_LABELS: Record<SceneType, string> = {
  default: "Mysterious Road",
  storm: "The Storm Path",
  treasure: "Ancient Ruins Trail",
  combat: "Danger Zone",
  ruins: "Forgotten Ruins",
  forest: "Enchanted Forest",
  snow: "Blizzard Pass",
  dungeon: "Sunken Dungeon",
  volcanic: "Volcanic Ridge",
  night: "Moonlit Path",
};

const SCENE_SUBTITLES: Record<SceneType, string> = {
  default: "Something stirs on the mountain road...",
  storm: "Lightning crackles. Proceed with caution.",
  treasure: "Golden light glints off the ancient stones.",
  combat: "A shadow moves between the rocks!",
  ruins: "Echoes of a lost civilization.",
  forest: "The trees whisper warnings of what lurks ahead.",
  snow: "Frost bites the air. Wind howls through the peaks.",
  dungeon: "Water drips in the darkness below.",
  volcanic: "The earth trembles. Embers drift on hot winds.",
  night: "Stars pierce the ink-black sky above.",
};

interface SceneViewProps {
  scene: SceneType;
  artIndex: number;
  onPress: () => void;
  disabled: boolean;
}

export function SceneView({ scene, artIndex, onPress, disabled }: SceneViewProps) {
  const fadeAnim = useRef(new RNAnimated.Value(1)).current;
  const prevArtIndex = useRef(artIndex);

  // Reanimated values for the live "explore" pulse + flash
  const pulse = useSharedValue(0);
  const flash = useSharedValue(0);

  // Crossfade when the background image cycles
  useEffect(() => {
    if (prevArtIndex.current !== artIndex) {
      prevArtIndex.current = artIndex;
      RNAnimated.sequence([
        RNAnimated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        RNAnimated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]).start();
    }
  }, [artIndex]);

  // Idle pulse on the explore button glow — only when ready
  useEffect(() => {
    if (!disabled) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 200 });
    }
    return () => cancelAnimation(pulse);
  }, [disabled]);

  // Cancel the press flash on unmount
  useEffect(() => () => cancelAnimation(flash), []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.55,
    transform: [{ scale: 1 + pulse.value * 0.06 }],
  }));

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const handlePress = () => {
    if (disabled) return;
    flash.value = withSequence(
      withTiming(0.4, { duration: 60 }),
      withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) }),
    );
    onPress();
  };

  const bgImage = BG_IMAGES[artIndex % BG_IMAGES_COUNT];

  return (
    <View style={styles.wrapper}>
      {/* Gold frame */}
      <LinearGradient
        colors={[Colors.game.gold, Colors.game.goldDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.frame}
      >
        <RNAnimated.View style={[styles.sceneContainer, { opacity: fadeAnim }]}>
          <View style={styles.pressable}>
            <Image source={bgImage} style={styles.img} resizeMode="cover" />

            {/* Mood tint */}
            {SCENE_TINT[scene] !== "transparent" && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: SCENE_TINT[scene] }]} />
            )}

            {/* Cinematic vignette */}
            <LinearGradient
              colors={["rgba(8,4,12,0.55)", "rgba(8,4,12,0)", "rgba(8,4,12,0.85)"]}
              locations={[0, 0.4, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Explore flash */}
            <Reanimated.View
              style={[StyleSheet.absoluteFill, styles.flashOverlay, flashStyle]}
              pointerEvents="none"
            />

            {/* Scene label — top-left banner */}
            <View style={styles.labelArea} pointerEvents="none">
              <View style={styles.labelBadge}>
                <Ionicons name="location" size={11} color={Colors.game.goldLight} />
                <Text style={styles.labelText}>{SCENE_LABELS[scene]}</Text>
              </View>
              <Text style={styles.subtitleText}>{SCENE_SUBTITLES[scene]}</Text>
            </View>

            {/* Explore button — centered at bottom */}
            <View style={styles.exploreArea} pointerEvents="box-none">
              <View style={styles.exploreBtnWrap}>
                <Reanimated.View style={[styles.exploreGlow, glowStyle]} pointerEvents="none" />
                {!disabled ? (
                  <FantasyButton
                    label="EXPLORE"
                    icon="footsteps"
                    size="lg"
                    variant="gold"
                    onPress={handlePress}
                    glow
                    testID="scene-press-button"
                    style={styles.exploreBtn}
                  />
                ) : (
                  <FantasyButton
                    label="EXPLORING..."
                    icon="compass"
                    size="lg"
                    variant="dark"
                    disabled
                    style={styles.exploreBtn}
                  />
                )}
              </View>
            </View>
          </View>
        </RNAnimated.View>
      </LinearGradient>
    </View>
  );
}

const IMG_HEIGHT = Platform.OS === "web" ? 240 : undefined;
const IMG_ASPECT = Platform.OS === "web" ? undefined : (16 / 9 as any);

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    shadowColor: Colors.game.gold,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  frame: {
    borderRadius: 20,
    padding: 2,
  },
  sceneContainer: { width: "100%", borderRadius: 18, overflow: "hidden" },
  pressable: {
    width: "100%",
    height: IMG_HEIGHT,
    aspectRatio: IMG_ASPECT,
    position: "relative",
    overflow: "hidden",
  },
  img: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    width: "100%",
    height: "100%",
  },
  flashOverlay: { backgroundColor: "#FFE9A0" },
  labelArea: {
    position: "absolute",
    top: 12, left: 12, right: 12,
  },
  labelBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(13,10,20,0.78)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.game.gold,
    marginBottom: 5,
  },
  labelText: {
    fontSize: 11, fontFamily: "Inter_700Bold",
    color: Colors.game.goldLight, letterSpacing: 1.2, textTransform: "uppercase",
  },
  subtitleText: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.game.text, opacity: 0.9,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  exploreArea: {
    position: "absolute",
    bottom: 14, left: 0, right: 0,
    alignItems: "center",
  },
  exploreBtnWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  exploreGlow: {
    position: "absolute",
    width: "120%",
    height: "180%",
    borderRadius: 40,
    backgroundColor: Colors.game.gold,
    shadowColor: Colors.game.goldBright,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  exploreBtn: {
    minWidth: 200,
  },
});
