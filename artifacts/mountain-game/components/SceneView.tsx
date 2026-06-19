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
import Colors from "@/constants/colors";
import { SceneType } from "@/context/GameContext";

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
}

export function SceneView({ scene, artIndex }: SceneViewProps) {
  const fadeAnim = useRef(new RNAnimated.Value(1)).current;
  const prevArtIndex = useRef(artIndex);

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

            {/* Scene label — top-left banner */}
            <View style={styles.labelArea} pointerEvents="none">
              <View style={styles.labelBadge}>
                <Ionicons name="location" size={11} color={Colors.game.goldLight} />
                <Text style={styles.labelText}>{SCENE_LABELS[scene]}</Text>
              </View>
              <Text style={styles.subtitleText}>{SCENE_SUBTITLES[scene]}</Text>
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
});
