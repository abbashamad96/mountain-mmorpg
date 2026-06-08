import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuctionHouseModal } from "@/components/AuctionHouseModal";
import { AuthModal } from "@/components/AuthModal";
import { OfflineOverlay } from "@/components/OfflineOverlay";
import { BattleDropModal, BattleDrop } from "@/components/BattleDropModal";
import { BattleModal } from "@/components/BattleModal";
import { ChatModal } from "@/components/ChatModal";
import { ChestDropModal } from "@/components/ChestDropModal";
import { ChestOpenModal } from "@/components/ChestOpenModal";
import { GatheringModal } from "@/components/GatheringModal";
import { NotificationsModal } from "@/components/NotificationsModal";
import { SceneView } from "@/components/SceneView";
import { StatsModal } from "@/components/StatsModal";
import { TimerBar } from "@/components/TimerBar";
import Colors from "@/constants/colors";
import {
  LogEntry,
  Material,
  RARITY_COLORS,
  MaterialEntry,
  NpcBattleStats,
  ItemChest,
  NpcDropResult,
  rollEvent,
  rollNpcDrop,
  useGame,
  getEffectiveStats,
  ActiveBuff,
} from "@/context/GameContext";
import { GameItem, ITEM_RARITY_COLORS, formatChestName, formatItemName, formatPotionName, ChestDrop } from "@/lib/items";
import { GatheringTool, MATERIAL_TO_TOOL, formatToolName } from "@/lib/tools";
import { FullChestDrop } from "@/components/ChestOpenModal";
import { useMultiplayer } from "@/context/MultiplayerContext";

// ─── AH toast banner ──────────────────────────────────────────────────────────

type AhToastData = { id: string; msg: string; isGold: boolean };

function AhToast({ toast }: { toast: AhToastData }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2700),
      Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[toastStyles.toast, { opacity: fade }]}>
      <Feather
        name={toast.isGold ? "dollar-sign" : "package"}
        size={11}
        color={toast.isGold ? Colors.game.gold : Colors.game.blue}
      />
      <Text style={toastStyles.toastTxt}>{toast.msg}</Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  toast: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "rgba(18,18,24,0.92)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.game.border,
    alignSelf: "flex-start",
  },
  toastTxt: {
    fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.game.text,
    flexShrink: 1,
  },
});

// ─── Scene / activity display helpers ────────────────────────────────────────

const SCENE_NAME_MAP: Record<string, string> = {
  default:  "Mysterious Road",
  storm:    "The Storm Path",
  treasure: "Ancient Ruins Trail",
  combat:   "Danger Zone",
  ruins:    "Forgotten Ruins",
  forest:   "Enchanted Forest",
  snow:     "Blizzard Pass",
  dungeon:  "Sunken Dungeon",
  volcanic: "Volcanic Ridge",
  night:    "Moonlit Path",
};

const SCENE_ACTIVITY_MAP: Record<string, { label: string; color: string }> = {
  default:  { label: "EXPLORING", color: Colors.game.gold },
  storm:    { label: "EXPLORING", color: Colors.game.gold },
  treasure: { label: "EXPLORING", color: Colors.game.gold },
  ruins:    { label: "EXPLORING", color: Colors.game.gold },
  night:    { label: "EXPLORING", color: Colors.game.gold },
  forest:   { label: "GATHERING", color: Colors.game.green },
  snow:     { label: "GATHERING", color: Colors.game.green },
  combat:   { label: "COMBAT",    color: Colors.game.red },
  dungeon:  { label: "COMBAT",    color: Colors.game.red },
  volcanic: { label: "COMBAT",    color: Colors.game.red },
};

// ─── Event log stack (above scene image) ─────────────────────────────────────

const MAX_LOG_VISIBLE = 4;

const TIER_COLORS: Record<number, string> = {
  1: "#A78BFA",
  2: "#34D399",
  3: "#FCD34D",
};

function LogEntryRow({ entry }: { entry: LogEntry }) {
  const mat = entry.material;
  const isVictory = entry.victory === true;
  const chest = entry.chest;
  const itemDrop = entry.itemDrop;

  // Extract NPC name from summary for battle entries
  let npcName = "";
  if (entry.type === "battle") {
    const m = isVictory
      ? entry.summary.match(/^Defeated (.+?) \+/)
      : entry.summary.match(/^Fled from (.+)$/);
    npcName = m ? m[1] : "";
  }

  return (
    <View style={logStackStyles.row}>
      {/* Left icon */}
      <View style={logStackStyles.iconWrap}>
        {entry.type === "gather" && (
          <Text style={logStackStyles.emoji}>⛏</Text>
        )}
        {entry.type === "battle" && (
          <Text style={logStackStyles.emoji}>{isVictory ? "⚔" : "🏃"}</Text>
        )}
        {entry.type === "item_chest" && (
          <Text style={logStackStyles.emoji}>📦</Text>
        )}
      </View>

      {/* Content */}
      <View style={logStackStyles.content}>
        {/* Gold / XP event */}
        {entry.type === "gold_xp" && (
          <View style={logStackStyles.inlineRow}>
            {entry.goldGained > 0 && (
              <View style={logStackStyles.inlineRow}>
                <Text style={logStackStyles.gold}>+{entry.goldGained}g</Text>
                {entry.goldBonus && entry.goldBonus > 0 && (
                  <Text style={logStackStyles.bonus}>+{entry.goldBonus} potion</Text>
                )}
              </View>
            )}
            {entry.xpGained > 0 && (
              <View style={logStackStyles.inlineRow}>
                <Text style={logStackStyles.xp}>+{entry.xpGained} xp</Text>
                {entry.xpBonus && entry.xpBonus > 0 && (
                  <Text style={logStackStyles.bonus}>+{entry.xpBonus} potion</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Chest found exploration event */}
        {entry.type === "item_chest" && chest && !itemDrop && (
          <View style={logStackStyles.battleBlock}>
            <View style={logStackStyles.inlineRow}>
              <Text style={logStackStyles.dimLabel}>Found</Text>
              <Text style={[logStackStyles.matName, { color: ITEM_RARITY_COLORS[chest.rarity] }]}>
                {chest.rarity} Chest
              </Text>
              <View style={[logStackStyles.tierBadge, { borderColor: "#555" }]}>
                <Text style={[logStackStyles.tierTxt, { color: "#aaa" }]}>T{chest.tier}</Text>
              </View>
            </View>
            <Text style={logStackStyles.dimLabel}>Added to bag — open from ITEMS tab</Text>
          </View>
        )}

        {/* Chest opened item drop */}
        {entry.type === "item_chest" && itemDrop && (
          <View style={logStackStyles.battleBlock}>
            <View style={logStackStyles.inlineRow}>
              <Text style={logStackStyles.dimLabel}>Opened</Text>
              <Text style={[logStackStyles.matName, { color: ITEM_RARITY_COLORS[chest!.rarity] }]}>
                {formatChestName(chest!)}
              </Text>
              <Text style={logStackStyles.dimLabel}>Got</Text>
              <Text style={[logStackStyles.matName, { color: ITEM_RARITY_COLORS[itemDrop.rarity] }]}>
                {formatItemName(itemDrop)}
              </Text>
            </View>
          </View>
        )}

        {/* Gather event */}
        {entry.type === "gather" && mat && (() => {
          const countMatch = entry.summary.match(/×(\d+)/);
          const count = countMatch ? parseInt(countMatch[1]) : 1;
          return (
            <View style={logStackStyles.battleBlock}>
              <View style={logStackStyles.inlineRow}>
                <Text style={logStackStyles.dimLabel}>Gathered</Text>
                <Text style={[logStackStyles.matName, { color: RARITY_COLORS[mat.rarity] ?? Colors.game.text }]}>
                  {mat.type}
                </Text>
                {mat.version > 0 && (
                  <View style={[logStackStyles.tierBadge, { borderColor: TIER_COLORS[mat.version] ?? Colors.game.border }]}>
                    <Text style={[logStackStyles.tierTxt, { color: TIER_COLORS[mat.version] ?? Colors.game.text }]}>
                      T{mat.version}
                    </Text>
                  </View>
                )}
                <Text style={[logStackStyles.rarityLabel, { color: RARITY_COLORS[mat.rarity] ?? Colors.game.text }]}>
                  {mat.rarity}
                </Text>
                {count > 1 && <Text style={logStackStyles.dimLabel}>×{count}</Text>}
              </View>
              {entry.xpGained > 0 && (
                <View style={logStackStyles.inlineRow}>
                  <Text style={logStackStyles.xp}>+{entry.xpGained} xp</Text>
                  {entry.xpBonus && entry.xpBonus > 0 && (
                    <Text style={logStackStyles.bonus}>+{entry.xpBonus} potion</Text>
                  )}
                </View>
              )}
            </View>
          );
        })()}

        {/* Battle event */}
        {entry.type === "battle" && (
          <View style={logStackStyles.battleBlock}>
            {/* Row 1: verb + NPC name (colored by rarity) + tier */}
            <View style={logStackStyles.inlineRow}>
              <Text style={logStackStyles.dimLabel}>{isVictory ? "Defeated" : "Fled from"}</Text>
              <Text
                style={[logStackStyles.npcName, entry.npcRarity ? { color: RARITY_COLORS[entry.npcRarity] } : null]}
                numberOfLines={1}
              >
                {npcName}
              </Text>
              {entry.npcVersion !== undefined && entry.npcVersion > 0 && (
                <View style={[logStackStyles.tierBadge, { borderColor: TIER_COLORS[entry.npcVersion] ?? Colors.game.border }]}>
                  <Text style={[logStackStyles.tierTxt, { color: TIER_COLORS[entry.npcVersion] ?? Colors.game.text }]}>
                    T{entry.npcVersion}
                  </Text>
                </View>
              )}
            </View>

            {/* Row 2: gold + xp rewards */}
            {(entry.goldGained > 0 || entry.xpGained > 0) && (
              <View style={logStackStyles.inlineRow}>
                {entry.goldGained > 0 && (
                  <View style={logStackStyles.inlineRow}>
                    <Text style={logStackStyles.gold}>+{entry.goldGained}g</Text>
                    {entry.goldBonus && entry.goldBonus > 0 && (
                      <Text style={logStackStyles.bonus}>+{entry.goldBonus} potion</Text>
                    )}
                  </View>
                )}
                {entry.xpGained > 0 && (
                  <View style={logStackStyles.inlineRow}>
                    <Text style={logStackStyles.xp}>+{entry.xpGained} xp</Text>
                    {entry.xpBonus && entry.xpBonus > 0 && (
                      <Text style={logStackStyles.bonus}>+{entry.xpBonus} potion</Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Row 3: drop — material OR item OR chest */}
            {mat && (
              <View style={logStackStyles.inlineRow}>
                <Text style={[logStackStyles.matName, { color: RARITY_COLORS[mat.rarity] ?? Colors.game.text }]}>
                  {mat.type}
                </Text>
                {mat.version > 0 && (
                  <View style={[logStackStyles.tierBadge, { borderColor: TIER_COLORS[mat.version] ?? Colors.game.border }]}>
                    <Text style={[logStackStyles.tierTxt, { color: TIER_COLORS[mat.version] ?? Colors.game.text }]}>
                      T{mat.version}
                    </Text>
                  </View>
                )}
              </View>
            )}
            {itemDrop && (
              <View style={logStackStyles.inlineRow}>
                <Text style={logStackStyles.dimLabel}>drop:</Text>
                <Text style={[logStackStyles.matName, { color: ITEM_RARITY_COLORS[itemDrop.rarity] }]}>
                  {itemDrop.name}
                </Text>
                <Text style={[logStackStyles.dimLabel]}>({itemDrop.slot})</Text>
              </View>
            )}
            {chest && (
              <View style={logStackStyles.inlineRow}>
                <Text style={logStackStyles.dimLabel}>drop:</Text>
                <Text style={[logStackStyles.matName, { color: ITEM_RARITY_COLORS[chest.rarity] }]}>
                  📦 {chest.rarity} Chest
                </Text>
              </View>
            )}
            {entry.potionDrop && (
              <View style={logStackStyles.inlineRow}>
                <Text style={[logStackStyles.matName, { color: ITEM_RARITY_COLORS[entry.potionDrop.rarity] }]}>
                  {entry.potionDrop.type} Potion
                </Text>
              </View>
            )}
            {!mat && !itemDrop && !chest && !entry.potionDrop && isVictory && (
              <Text style={logStackStyles.dimLabel}>no drop</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function EventLogStack({ logs }: { logs: LogEntry[] }) {
  // eventLog is stored newest-first; take the most recent N then reverse for oldest-top display
  const recent = logs.slice(0, MAX_LOG_VISIBLE).reverse();
  const animMapRef = useRef<Map<string, Animated.Value>>(new Map());
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const map = animMapRef.current;
    let changed = false;
    for (const entry of recent) {
      if (!map.has(entry.id)) {
        const anim = new Animated.Value(0);
        map.set(entry.id, anim);
        Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        changed = true;
      }
    }
    for (const key of Array.from(map.keys())) {
      if (!recent.find((e) => e.id === key)) {
        map.delete(key);
        changed = true;
      }
    }
    if (changed) forceUpdate((n) => n + 1);
  }, [logs]);

  if (recent.length === 0) return null;
  const map = animMapRef.current;

  return (
    <View style={logStackStyles.container}>
      {recent.map((entry) => {
        const anim = map.get(entry.id);
        if (!anim) return null;
        const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
        return (
          <Animated.View
            key={entry.id}
            style={{ opacity: anim, transform: [{ translateY }] }}
          >
            <LogEntryRow entry={entry} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const logStackStyles = StyleSheet.create({
  container: { gap: 5 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(10,7,18,0.88)",
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.5)",
  },
  iconWrap: {
    width: 22,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 1,
  },
  gCoin: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.game.gold,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#a07820",
  },
  gCoinTxt: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#3d2e00" },
  xpStar: { fontSize: 13, color: Colors.game.purpleLight },
  emoji: { fontSize: 14 },
  content: { flex: 1, gap: 3 },
  battleBlock: { gap: 3 },
  inlineRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5 },
  dimLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
  matName: { fontSize: 12, fontFamily: "Inter_700Bold" },
  rarityLabel: { fontSize: 11, fontFamily: "Inter_500Medium", opacity: 0.85 },
  npcName: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.game.text },
  gold: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  xp: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.game.purpleLight },
  bonus: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.game.blueLight, opacity: 0.8 },
  tierBadge: {
    borderWidth: 1, borderRadius: 5,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  tierTxt: { fontSize: 10, fontFamily: "Inter_700Bold" },
});

// ─── Active buff countdown pills ──────────────────────────────────────────────

const BUFF_ICONS: Record<string, string> = {
  Gold: "💰", XP: "⭐", Exploration: "⚡",
};
const BUFF_PILL_COLORS: Record<string, string> = {
  Gold:        Colors.game.gold,
  XP:          Colors.game.purpleLight,
  Exploration: Colors.game.blueLight,
};

function ActiveBuffPills({ buffs }: { buffs: ActiveBuff[] }) {
  const [, setTick] = useState(0);

  const now = Date.now();
  const active = buffs.filter((b) => b.expiresAt > now);

  useEffect(() => {
    if (active.length === 0) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active.length]);

  if (active.length === 0) return null;

  return (
    <View style={pillStyles.row}>
      {active.map((buff) => {
        const remaining = Math.max(0, Math.ceil((buff.expiresAt - Date.now()) / 1000));
        if (remaining <= 0) return null;
        const color = BUFF_PILL_COLORS[buff.type] ?? Colors.game.gold;
        const pct = Math.round((buff.multiplier - 1) * 100);
        return (
          <View key={buff.type} style={[pillStyles.pill, { borderColor: color + "55" }]}>
            <Text style={pillStyles.pillIcon}>{BUFF_ICONS[buff.type] ?? "✨"}</Text>
            <Text style={[pillStyles.pillLabel, { color }]}>{buff.type} +{pct}%</Text>
            <View style={[pillStyles.pillTimer, { backgroundColor: color + "22" }]}>
              <Text style={[pillStyles.pillTime, { color }]}>{remaining}s</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const pillStyles = StyleSheet.create({
  row: {
    flexDirection: "row", flexWrap: "wrap", gap: 6,
    paddingHorizontal: 16, paddingTop: 6,
  },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.game.surface,
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  pillIcon: { fontSize: 12 },
  pillLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  pillTimer: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 2 },
  pillTime:  { fontSize: 10, fontFamily: "Inter_700Bold" },
});

// ─── Bottom tab bar ───────────────────────────────────────────────────────────

interface BottomTabBarProps {
  onPressAH: () => void;
  onPressInventory: () => void;
  onPressChat: () => void;
  onPressAccount: () => void;
  onPressNotifications: () => void;
  unreadCount: number;
  pendingStatPoints: number;
  isAuthenticated: boolean;
  bottomPad: number;
}

function BottomTabBar({
  onPressAH, onPressInventory, onPressChat, onPressAccount,
  unreadCount, pendingStatPoints, isAuthenticated, bottomPad,
}: BottomTabBarProps) {
  return (
    <View style={[tabBarStyles.bar, { paddingBottom: bottomPad + 6 }]}>
      {/* Mountain — always active */}
      <View style={tabBarStyles.tab}>
        <Feather name="map-pin" size={22} color={Colors.game.gold} />
        <Text style={[tabBarStyles.label, { color: Colors.game.gold }]}>Mountain</Text>
      </View>

      {/* Market / AH */}
      <Pressable style={tabBarStyles.tab} onPress={onPressAH} hitSlop={8}>
        <Feather name="shopping-bag" size={22} color={Colors.game.textDim} />
        <Text style={tabBarStyles.label}>Market</Text>
      </Pressable>

      {/* Inventory */}
      <Pressable style={tabBarStyles.tab} onPress={onPressInventory} hitSlop={8}>
        <View style={tabBarStyles.iconWrap}>
          <Feather name="package" size={22} color={Colors.game.textDim} />
          {pendingStatPoints > 0 && (
            <View style={tabBarStyles.badge}>
              <Text style={tabBarStyles.badgeText}>{pendingStatPoints}</Text>
            </View>
          )}
        </View>
        <Text style={tabBarStyles.label}>Inventory</Text>
      </Pressable>

      {/* Chat */}
      <Pressable style={tabBarStyles.tab} onPress={onPressChat} hitSlop={8}>
        <View style={tabBarStyles.iconWrap}>
          <Feather name="message-circle" size={22} color={Colors.game.textDim} />
          {unreadCount > 0 && (
            <View style={[tabBarStyles.badge, { backgroundColor: Colors.game.red }]}>
              <Text style={tabBarStyles.badgeText}>{unreadCount > 9 ? "9+" : String(unreadCount)}</Text>
            </View>
          )}
        </View>
        <Text style={tabBarStyles.label}>Chat</Text>
      </Pressable>

      {/* Account */}
      <Pressable style={tabBarStyles.tab} onPress={onPressAccount} hitSlop={8}>
        <Feather
          name={isAuthenticated ? "check-circle" : "key"}
          size={22}
          color={isAuthenticated ? Colors.game.green : Colors.game.textDim}
        />
        <Text style={[tabBarStyles.label, isAuthenticated ? { color: Colors.game.green } : undefined]}>
          {isAuthenticated ? "Online" : "Account"}
        </Text>
      </Pressable>
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: Colors.game.surface,
    borderTopWidth: 1, borderTopColor: Colors.game.border,
    paddingTop: 10, paddingHorizontal: 10,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  iconWrap: { position: "relative" },
  label: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.game.textDim, letterSpacing: 0.3 },
  badge: {
    position: "absolute", top: -5, right: -8,
    backgroundColor: Colors.game.purple,
    borderRadius: 8, minWidth: 15, height: 15, paddingHorizontal: 3,
    alignItems: "center", justifyContent: "center",
  },
  badgeText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#fff" },
});

export default function GameScreen() {
  const {
    gameState, setScene, applyGoldXp, addMaterials, addLogEntry,
    incrementEvents, loadState, resetGameState,
    addItemToBag, addChestToBag, addPotionToBag, getActiveBuffMultiplier,
    addToolToBag,
  } = useGame();
  const {
    ahEvents, consumeAhEvent,
    isAuthenticated, authUsername, serverGameState, clearServerGameState,
    saveGameState, accountSwitched, consumeAccountSwitch,
    sessionExpired, kicked, clearKicked,
    status, isOnline,
    unreadCount,
    logout,
  } = useMultiplayer();

  const hasEverConnectedRef = useRef(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [cooldownDuration, setCooldownDuration] = useState(2500);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);


  const gatherXpRef = useRef(0);
  const gatherXpBonusRef = useRef(0);

  const [artIndex, setArtIndex] = useState(0);
  const artTriggerRef = useRef(0);
  const artThresholdRef = useRef(Math.floor(10 + Math.random() * 11));

  const [showStats, setShowStats] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showAuction, setShowAuction] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [gatherMaterial, setGatherMaterial] = useState<Material | null>(null);
  const [gatherAttempts, setGatherAttempts] = useState(1);
  const [showGather, setShowGather] = useState(false);
  const [battleNpc, setBattleNpc] = useState<NpcBattleStats | null>(null);
  const battleNpcRef = useRef<NpcBattleStats | null>(null);
  const [showBattle, setShowBattle] = useState(false);
  const [preSelectForAh, setPreSelectForAh] = useState<MaterialEntry | null>(null);
  const [preSelectItemForAh, setPreSelectItemForAh] = useState<GameItem | null>(null);
  const [preSelectChestForAh, setPreSelectChestForAh] = useState<ItemChest | null>(null);
  const [preSelectPotionForAh, setPreSelectPotionForAh] = useState<any>(null);
  const [preSelectToolForAh, setPreSelectToolForAh] = useState<GatheringTool | null>(null);
  const [pendingDropChest, setPendingDropChest] = useState<ItemChest | null>(null);
  const pendingDropCooldownRef = useRef<number>(500);
  const [autoOpenChest, setAutoOpenChest] = useState<ItemChest | null>(null);
  const [battleDrops, setBattleDrops] = useState<BattleDrop[]>([]);
  const [battleDropNpcName, setBattleDropNpcName] = useState("");
  const [showBattleDrops, setShowBattleDrops] = useState(false);
  const [ahToasts, setAhToasts] = useState<AhToastData[]>([]);

  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const char = gameState.character;

  // ── Track first successful connection so overlay doesn't flash on boot ──
  useEffect(() => {
    if (status === "connected") hasEverConnectedRef.current = true;
  }, [status]);

  // ── Wipe local state when saved session is rejected by server ────────────
  // sessionExpired is cleared in the context's auth_ok handler on re-login.
  useEffect(() => {
    if (sessionExpired) {
      resetGameState();
    }
  }, [sessionExpired, resetGameState]);

  // ── Show kick notification when logged in from another location ───────────
  useEffect(() => {
    if (kicked) {
      addLogEntry({
        id: `kick-${Date.now()}`,
        timestamp: Date.now(),
        type: "system",
        summary: "You were logged out: account opened in another location.",
        goldGained: 0, xpGained: 0, material: null,
      });
      clearKicked();
    }
  }, [kicked, clearKicked, addLogEntry]);

  // ── Load server state on login — always reset local first so server wins ──
  useEffect(() => {
    if (serverGameState !== null) {
      resetGameState();
      consumeAccountSwitch();
      loadState(serverGameState as any);
      clearServerGameState();
    }
  }, [serverGameState, resetGameState, consumeAccountSwitch, loadState, clearServerGameState]);

  // ── Auto-save game state when authenticated and connected ────────────────
  // Fires ~1 s after any gameState change (combat, gather, AH event, stat
  // allocation…).  Connection is checked before scheduling — if the socket
  // drops mid-action the timer is never started and the save waits until
  // the reconnect re-triggers this effect with status === "connected".
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isAuthenticated || status !== "connected") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveGameState(gameState);
    }, 1000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [gameState, isAuthenticated, status, saveGameState]);

  // ── AH toast helper ───────────────────────────────────────────────────────
  const pushToast = useCallback((msg: string, isGold: boolean) => {
    if (!msg || !msg.trim()) return;
    const id = `t-${Date.now()}-${Math.random()}`;
    setAhToasts((prev) => [...prev, { id, msg, isGold }]);
    setTimeout(() => setAhToasts((prev) => prev.filter((t) => t.id !== id)), 3600);
  }, []);

  // ── Process AH + buy order events ────────────────────────────────────────
  useEffect(() => {
    for (const ev of ahEvents) {
      if (ev.kind === "sale") {
        applyGoldXp(ev.listing!.price, 0);
        const matTypeStr = ev.listing?.material?.type as string | undefined;
        const isSaleEquip = matTypeStr === "Equipment";
        const isSaleChest = matTypeStr === "Chest";
        const isSalePotion = matTypeStr === "Potion";
        pushToast(
          isSaleEquip
            ? `${(ev.listing!.item as any)?.slot ?? "Equipment"} sold! +${ev.listing!.price.toLocaleString()}G`
            : isSaleChest
            ? `Chest sold! +${ev.listing!.price.toLocaleString()}G`
            : isSalePotion
            ? `Potion sold! +${ev.listing!.price.toLocaleString()}G`
            : `Listing sold! +${ev.listing!.price.toLocaleString()}G`,
          true,
        );
        consumeAhEvent(ev.id);
      } else if (ev.kind === "bought") {
        const matTypeStr = ev.listing?.material?.type as string | undefined;
        const isBoughtEquip = matTypeStr === "Equipment";
        const isBoughtChest = matTypeStr === "Chest";
        const isBoughtPotion = matTypeStr === "Potion";
        if (isBoughtPotion) {
          addPotionToBag(ev.listing!.item as any);
          pushToast(`Received ${ev.listing!.material.rarity} Potion!`, false);
        } else if (!isBoughtEquip && !isBoughtChest) {
          addMaterials(Array(ev.listing!.count).fill(ev.listing!.material));
          pushToast(`Received ×${ev.listing!.count} ${ev.listing!.material.rarity} ${ev.listing!.material.type}`, false);
        } else if (isBoughtEquip) {
          pushToast(`Received ${ev.listing!.material.rarity} ${(ev.listing!.item as any)?.slot ?? "Equipment"}!`, false);
        } else {
          pushToast(`Received T${ev.listing!.material.version ?? 0} ${ev.listing!.material.rarity} Chest!`, false);
        }
        consumeAhEvent(ev.id);
      } else if (ev.kind === "cancelled") {
        const matTypeStr = ev.listing?.material?.type as string | undefined;
        const isCancelledEquip = matTypeStr === "Equipment";
        const isCancelledChest = matTypeStr === "Chest";
        const isCancelledPotion = matTypeStr === "Potion";
        if (isCancelledPotion) {
          addPotionToBag(ev.listing!.item as any);
        } else if (!isCancelledEquip && !isCancelledChest) {
          addMaterials(Array(ev.listing!.count).fill(ev.listing!.material));
        }
        consumeAhEvent(ev.id);
      } else if (ev.kind === "bo_sold") {
        if (ev.boGoldEarned && ev.boGoldEarned > 0) {
          applyGoldXp(ev.boGoldEarned, 0);
          pushToast(`Buy order filled! +${ev.boGoldEarned.toLocaleString()}G`, true);
        }
        consumeAhEvent(ev.id);
      } else if (ev.kind === "bo_received") {
        if (ev.boMaterial) {
          const isPotion = ev.boMaterial.type === "Potion";
          pushToast(
            isPotion
              ? `Received ${ev.boMaterial.rarity} Potion from order`
              : `Received ×${ev.boCount} ${ev.boMaterial.rarity} ${ev.boMaterial.type} from order`,
            false
          );
        }
        consumeAhEvent(ev.id);
      } else if (ev.kind === "bo_cancelled") {
        if (ev.boGoldReturn && ev.boGoldReturn > 0) {
          applyGoldXp(ev.boGoldReturn, 0);
          pushToast(`Order cancelled — +${ev.boGoldReturn.toLocaleString()}G refunded`, true);
        }
        consumeAhEvent(ev.id);
      }
    }
  }, [ahEvents, applyGoldXp, addMaterials, consumeAhEvent, pushToast]);

  // ── Scene exploration ─────────────────────────────────────────────────────
  const handleScenePress = useCallback(() => {
    if (isInteracting) return;

    const baseDuration = Math.floor(2500 + Math.random() * 1500);
    const cooldownReduction = getActiveBuffMultiplier("Exploration");
    const duration = Math.max(800, Math.floor(baseDuration / cooldownReduction));
    setCooldownDuration(duration);
    setIsInteracting(true);

    const roll = rollEvent(char);
    setScene(roll.sceneType);
    incrementEvents();

    artTriggerRef.current += 1;
    if (artTriggerRef.current >= artThresholdRef.current) {
      artTriggerRef.current = 0;
      artThresholdRef.current = Math.floor(10 + Math.random() * 11);
      setArtIndex((prev) => prev + 1);
    }

    if (roll.type === "gold_xp") {
      const result = applyGoldXp(roll.goldGained, roll.xpGained);
      const goldBonus = result.goldBonus;
      const xpBonus = result.xpBonus;
      const baseGold = roll.goldGained;
      const baseXp = roll.xpGained;
      if (baseGold > 0 || baseXp > 0) {
        const goldStr = baseGold > 0
          ? `+${baseGold}g${goldBonus > 0 ? ` (+${goldBonus} potion)` : ""}`
          : "";
        const xpStr = baseXp > 0
          ? ` +${baseXp}xp${xpBonus > 0 ? ` (+${xpBonus} potion)` : ""}`
          : "";
        addLogEntry({
          id: roll.id,
          timestamp: roll.timestamp,
          type: "gold_xp",
          summary: `${goldStr}${xpStr}`,
          goldGained: baseGold,
          xpGained: baseXp,
          goldBonus: result.goldBonus > 0 ? result.goldBonus : undefined,
          xpBonus: result.xpBonus > 0 ? result.xpBonus : undefined,
          material: null,
        });
      }
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
      cooldownTimer.current = setTimeout(() => setIsInteracting(false), duration);
    } else if (roll.type === "gather" && roll.material) {
      gatherXpRef.current = 0;
      gatherXpBonusRef.current = 0;
      setGatherMaterial(roll.material);
      setGatherAttempts(roll.gatherAttempts);
      setShowGather(true);
    } else if (roll.type === "battle" && roll.npc) {
      battleNpcRef.current = roll.npc;
      setBattleNpc(roll.npc);
      setShowBattle(true);
    } else if (roll.type === "item_chest" && roll.chest) {
      const autoOpen = Math.random() < 0.9;
      if (autoOpen) {
        // 90%: auto-open chest — player must tap OPEN CHEST to interact
        pendingDropCooldownRef.current = duration;
        setAutoOpenChest(roll.chest);
        addLogEntry({
          id: roll.id,
          timestamp: roll.timestamp,
          type: "item_chest",
          summary: `Found a ${roll.chest.rarity} Chest! (Tap to open)`,
          goldGained: 0,
          xpGained: 0,
          material: null,
          chest: roll.chest,
        });
      } else {
        // 10%: collectable chest goes to bag
        pendingDropCooldownRef.current = duration;
        setPendingDropChest(roll.chest);
        addLogEntry({
          id: roll.id,
          timestamp: roll.timestamp,
          type: "item_chest",
          summary: `Found a ${roll.chest.rarity} Chest!`,
          goldGained: 0,
          xpGained: 0,
          material: null,
          chest: roll.chest,
        });
      }
    }
  }, [isInteracting, char, applyGoldXp, addMaterials, addItemToBag, addLogEntry, incrementEvents, setScene, getActiveBuffMultiplier]);

  const handleGatherComplete = useCallback(
    (gathered: Material[]) => {
      setShowGather(false);
      if (gathered.length > 0) {
        addMaterials(gathered);
        const mat = gathered[0];
        const totalXp = gatherXpRef.current;
        const xpBonus = gatherXpBonusRef.current;
        addLogEntry({
          id: `g-${Date.now()}`,
          timestamp: Date.now(),
          type: "gather",
          summary: `Gathered ${mat.type} ×${gathered.length}`,
          goldGained: 0,
          xpGained: totalXp,
          xpBonus: xpBonus > 0 ? xpBonus : undefined,
          material: mat,
        });
      }
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
      cooldownTimer.current = setTimeout(() => setIsInteracting(false), 500);
    },
    [addMaterials, addLogEntry]
  );

  const handleBattleComplete = useCallback(
    (victory: boolean, goldReward: number, xpReward: number) => {
      setShowBattle(false);
      let battleResult = null as null | ReturnType<typeof applyGoldXp>;
      if (victory && (goldReward > 0 || xpReward > 0)) {
        battleResult = applyGoldXp(goldReward, xpReward);
      }
      const npc = battleNpcRef.current;
      if (npc) {
        let drops: BattleDrop[] = [];
        let droppedMat: Material | null = null;
        let dropCount = 0;
        let droppedItem = undefined as typeof undefined | NonNullable<LogEntry["itemDrop"]>;
        let droppedChest = undefined as typeof undefined | NonNullable<LogEntry["chest"]>;
        let droppedPotion = undefined as typeof undefined | NonNullable<LogEntry["potionDrop"]>;

        if (victory) {
          const drop: NpcDropResult = rollNpcDrop(npc);
          if (drop?.type === "material") {
            droppedMat = drop.material;
            dropCount = drop.count;
            drops.push({ type: "material", material: drop.material, count: drop.count });
          } else if (drop?.type === "item") {
            droppedItem = drop.item;
            drops.push({ type: "item", item: drop.item });
          } else if (drop?.type === "potion") {
            droppedPotion = drop.potion;
            drops.push({ type: "potion", potion: drop.potion });
          } else if (drop?.type === "chest") {
            droppedChest = drop.chest;
            drops.push({ type: "chest", chest: drop.chest });
          } else if (drop?.type === "tool") {
            drops.push({ type: "tool", tool: drop.tool });
          }
        }

        let dropSuffix = "";
        if (droppedMat) dropSuffix = ` \u00b7 ${droppedMat.type}${dropCount > 1 ? ` \u00d7${dropCount}` : ""}`;
        else if (droppedItem) dropSuffix = ` \u00b7 ${droppedItem.name}`;
        else if (droppedPotion) dropSuffix = ` \u00b7 ${droppedPotion.type} Potion`;
        else if (droppedChest) dropSuffix = ` \u00b7 \ud83d\udce6 ${droppedChest.rarity} Chest`;

        const goldBonus = battleResult ? battleResult.goldBonus : 0;
        const xpBonus = battleResult ? battleResult.xpBonus : 0;
        const goldStr = goldReward > 0
          ? `+${goldReward}g${goldBonus > 0 ? ` (+${goldBonus} potion)` : ""}`
          : "";
        const xpStr = xpReward > 0
          ? ` +${xpReward}xp${xpBonus > 0 ? ` (+${xpBonus} potion)` : ""}`
          : "";

        addLogEntry({
          id: `b-${Date.now()}`,
          timestamp: Date.now(),
          type: "battle",
          summary: victory
            ? `Defeated ${npc.name} (T${npc.version}) ${goldStr}${xpStr}${dropSuffix}`
            : `Fled from ${npc.name}`,
          goldGained: goldReward,
          xpGained: xpReward,
          goldBonus: goldBonus > 0 ? goldBonus : undefined,
          xpBonus: xpBonus > 0 ? xpBonus : undefined,
          material: droppedMat,
          dropCount: dropCount > 0 ? dropCount : undefined,
          npcRarity: npc.rarity,
          npcVersion: npc.version,
          victory,
          itemDrop: droppedItem,
          potionDrop: droppedPotion,
          chest: droppedChest,
        });

        if (drops.length > 0 && victory) {
          setBattleDrops(drops);
          setBattleDropNpcName(npc.name);
          setShowBattleDrops(true);
        } else {
          cooldownTimer.current = setTimeout(() => setIsInteracting(false), 500);
        }
      } else {
        cooldownTimer.current = setTimeout(() => setIsInteracting(false), 500);
      }
    },
    [applyGoldXp, addLogEntry]
  );

  const handleCollectBattleDrops = useCallback(() => {
    for (const drop of battleDrops) {
      if (drop.type === "material") {
        const mats = Array.from({ length: drop.count }, () => ({ ...drop.material }));
        addMaterials(mats);
      } else if (drop.type === "item") {
        addItemToBag(drop.item);
      } else if (drop.type === "potion") {
        addPotionToBag(drop.potion);
      } else if (drop.type === "chest") {
        setPendingDropChest(drop.chest);
        pendingDropCooldownRef.current = 400;
      } else if (drop.type === "tool") {
        addToolToBag(drop.tool);
      }
    }
    setShowBattleDrops(false);
    setBattleDrops([]);
    if (!battleDrops.some((d) => d.type === "chest")) {
      cooldownTimer.current = setTimeout(() => setIsInteracting(false), 500);
    }
  }, [battleDrops, addMaterials, addItemToBag, addPotionToBag, addToolToBag]);

  const handleCloseBattleDrops = useCallback(() => {
    setShowBattleDrops(false);
    setBattleDrops([]);
    cooldownTimer.current = setTimeout(() => setIsInteracting(false), 500);
  }, []);

  // ── List item from inventory → AH ─────────────────────────────────────────
  const handleListOnAh = useCallback((entry: MaterialEntry) => {
    setShowStats(false);
    setPreSelectForAh(entry);
    setPreSelectItemForAh(null);
    setShowAuction(true);
  }, []);

  const handleListItemOnAh = useCallback((item: GameItem) => {
    setShowStats(false);
    setPreSelectForAh(null);
    setPreSelectItemForAh(item);
    setShowAuction(true);
  }, []);

  const handleAhClose = useCallback(() => {
    setShowAuction(false);
    setPreSelectForAh(null);
    setPreSelectItemForAh(null);
    setPreSelectChestForAh(null);
    setPreSelectPotionForAh(null);
    setPreSelectToolForAh(null);
  }, []);

  const handleListChestOnAh = useCallback((chest: ItemChest) => {
    setShowStats(false);
    setPreSelectChestForAh(chest);
    setShowAuction(true);
  }, []);

  const handleListPotionOnAh = useCallback((potion: any) => {
    setShowStats(false);
    setPreSelectPotionForAh(potion);
    setShowAuction(true);
  }, []);

  const handleListToolOnAh = useCallback((tool: GatheringTool) => {
    setShowStats(false);
    setPreSelectToolForAh(tool);
    setShowAuction(true);
  }, []);

  const handleListBattleDropOnAh = useCallback((drop: BattleDrop) => {
    if (drop.type === "material") {
      const key = `${drop.material.type}-${drop.material.rarity}-${drop.material.version}`;
      setPreSelectForAh({ material: drop.material, count: drop.count, key });
    } else if (drop.type === "item") {
      setPreSelectItemForAh(drop.item);
    } else if (drop.type === "potion") {
      setPreSelectPotionForAh(drop.potion);
    } else if (drop.type === "tool") {
      setPreSelectToolForAh(drop.tool);
    } else if (drop.type === "chest") {
      setPreSelectChestForAh(drop.chest);
    }
    handleCollectBattleDrops();
    setShowAuction(true);
  }, [handleCollectBattleDrops]);

  const handleChestDropCollect = useCallback((chest: ItemChest) => {
    addChestToBag(chest);
    setPendingDropChest(null);
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    cooldownTimer.current = setTimeout(() => setIsInteracting(false), 500);
  }, [addChestToBag]);

  // ── Inactivity auto-logout (5 minutes) ────────────────────────────────────────
  // Any press anywhere on the screen resets the 5-minute timer.  If the
  // player walks away from the device, the timer expires and they are logged
  // out automatically (game state is already saved by the per-action save).
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INACTIVITY_MS = 5 * 60 * 1000;
  useEffect(() => {
    if (!isAuthenticated) return;
    function reset() {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        logout();
        setShowAuth(true);
      }, INACTIVITY_MS);
    }
    reset();
    return () => { if (inactivityTimer.current) clearTimeout(inactivityTimer.current); };
  }, [isAuthenticated, logout]);

  return (
    <Pressable
      style={styles.root}
      onPress={() => {
        if (inactivityTimer.current) { clearTimeout(inactivityTimer.current); }
        inactivityTimer.current = setTimeout(() => {
          logout();
          setShowAuth(true);
        }, INACTIVITY_MS);
      }}
    >
      {/* ── Character header card ─────────────────────────────────────────── */}
      <View style={[styles.characterCard, { paddingTop: topPad + 10 }]}>
        <View style={styles.charRow}>
          {/* Avatar circle */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>
                {authUsername ? authUsername[0].toUpperCase() : "?"}
              </Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>LV{char.level}</Text>
            </View>
          </View>

          {/* Name + scene + XP bar */}
          <View style={styles.charMeta}>
            <Text style={styles.charName} numberOfLines={1}>
              {authUsername ?? "Traveler"}
            </Text>
            <Text style={styles.charScene} numberOfLines={1}>
              {SCENE_NAME_MAP[gameState.currentScene] ?? "Mountain Road"}
            </Text>
            <View style={styles.xpRow}>
              <View style={styles.xpTrack}>
                <View
                  style={[
                    styles.xpFill,
                    { width: `${Math.min(100, (char.xp / char.xpToNext) * 100)}%` as any },
                  ]}
                />
              </View>
              <Text style={styles.xpText}>{char.xp}/{char.xpToNext} XP</Text>
            </View>
          </View>

          {/* Gold + activity badge + notification bell */}
          <View style={styles.charRight}>
            <View style={styles.charRightTop}>
              <Pressable style={styles.notifBtn} onPress={() => setShowNotifications(true)} hitSlop={4}>
                <Feather
                  name="bell"
                  size={16}
                  color={unreadCount > 0 ? Colors.game.gold : Colors.game.textDim}
                />
                {unreadCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>
            <View style={styles.goldRow}>
              <Text style={styles.goldIcon}>🪙</Text>
              <Text style={styles.goldValue}>{char.gold.toLocaleString()}</Text>
            </View>
            {(() => {
              const act = SCENE_ACTIVITY_MAP[gameState.currentScene] ?? SCENE_ACTIVITY_MAP.default;
              return (
                <View style={[styles.activityBadge, { backgroundColor: act.color + "22", borderColor: act.color + "88" }]}>
                  <Text style={[styles.activityText, { color: act.color }]}>{act.label}</Text>
                </View>
              );
            })()}
          </View>
        </View>
      </View>

      {/* ── Active potion buff pills ──────────────────────────────────────── */}
      <ActiveBuffPills buffs={char.activeBuffs} />

      {/* ── AH toasts ────────────────────────────────────────────────────── */}
      {ahToasts.length > 0 && (
        <View style={styles.toastsWrap}>
          {ahToasts.map((t) => <AhToast key={t.id} toast={t} />)}
        </View>
      )}

      {/* ── Event log ────────────────────────────────────────────────────── */}
      <View style={styles.logWrap}>
        <EventLogStack logs={gameState.eventLog} />
      </View>

      {/* ── Scene — fills remaining space ────────────────────────────────── */}
      <View style={styles.sceneWrap}>
        <SceneView
          scene={gameState.currentScene}
          artIndex={artIndex}
          onPress={handleScenePress}
          disabled={isInteracting}
        />
      </View>

      {/* ── Timer bar ────────────────────────────────────────────────────── */}
      <TimerBar
        isActive={isInteracting}
        duration={cooldownDuration}
        color={getActiveBuffMultiplier("Exploration") > 1 ? Colors.game.blueLight : undefined}
      />

      {/* ── Bottom tab bar ───────────────────────────────────────────────── */}
      <BottomTabBar
        onPressAH={() => setShowAuction(true)}
        onPressInventory={() => setShowStats(true)}
        onPressChat={() => setShowChat(true)}
        onPressAccount={() => setShowAuth(true)}
        onPressNotifications={() => setShowNotifications(true)}
        unreadCount={unreadCount}
        pendingStatPoints={char.pendingStatPoints}
        isAuthenticated={isAuthenticated}
        bottomPad={bottomPad}
      />

      {/* Modals */}
      <AuctionHouseModal
        visible={showAuction}
        onClose={handleAhClose}
        preSelectedEntry={preSelectForAh}
        preSelectedItem={preSelectItemForAh}
        preSelectedChest={preSelectChestForAh}
        preSelectedPotion={preSelectPotionForAh}
        preSelectedTool={preSelectToolForAh}
      />
      <ChestDropModal chest={pendingDropChest} onCollect={handleChestDropCollect} />
      {autoOpenChest && (
        <ChestOpenModal
          key={autoOpenChest.id}
          chest={autoOpenChest}
          onClaim={(drop: FullChestDrop) => {
            const isTool = "passiveChance" in drop;
            const isItem = !isTool && "slot" in drop;
            if (isTool) {
              addToolToBag(drop as GatheringTool);
              pushToast(`Chest opened! Got ${formatToolName(drop as GatheringTool)}`, false);
              addLogEntry({
                id: `c-${Date.now()}`,
                timestamp: Date.now(),
                type: "item_chest",
                summary: `You opened ${formatChestName(autoOpenChest!)} and got ${formatToolName(drop as GatheringTool)}`,
                goldGained: 0,
                xpGained: 0,
                material: null,
                chest: autoOpenChest,
              });
            } else if (isItem) {
              addItemToBag(drop as GameItem);
              pushToast(`Chest opened! Got ${formatItemName(drop as GameItem)}`, false);
              addLogEntry({
                id: `c-${Date.now()}`,
                timestamp: Date.now(),
                type: "item_chest",
                summary: `You opened ${formatChestName(autoOpenChest!)} and got ${formatItemName(drop as GameItem)}`,
                goldGained: 0,
                xpGained: 0,
                material: null,
                itemDrop: drop as GameItem,
                chest: autoOpenChest,
              });
            } else {
              addPotionToBag(drop as any);
              pushToast(`Chest opened! Got ${formatPotionName(drop as any)}`, false);
              addLogEntry({
                id: `c-${Date.now()}`,
                timestamp: Date.now(),
                type: "item_chest",
                summary: `You opened ${formatChestName(autoOpenChest!)} and got ${formatPotionName(drop as any)}`,
                goldGained: 0,
                xpGained: 0,
                material: null,
                chest: autoOpenChest,
              });
            }
            setAutoOpenChest(null);
            if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
            cooldownTimer.current = setTimeout(() => setIsInteracting(false), 500);
          }}
        />
      )}
      <AuthModal visible={showAuth || !isAuthenticated} onClose={() => setShowAuth(false)} />
      <NotificationsModal visible={showNotifications} onClose={() => setShowNotifications(false)} />
      <ChatModal visible={showChat} onClose={() => setShowChat(false)} />
      <StatsModal
        visible={showStats}
        onClose={() => setShowStats(false)}
        onListOnAh={handleListOnAh}
        onListItemOnAh={handleListItemOnAh}
        onListChestOnAh={handleListChestOnAh}
        onListPotionOnAh={handleListPotionOnAh}
        onListToolOnAh={handleListToolOnAh}
      />
      <GatheringModal
        visible={showGather}
        material={gatherMaterial}
        totalAttempts={gatherAttempts}
        xpToNext={char.xpToNext}
        equippedTool={gatherMaterial ? (char.equippedTools[MATERIAL_TO_TOOL[gatherMaterial.type]] ?? null) : null}
        onComplete={handleGatherComplete}
        onAttemptXp={(xp) => { const result = applyGoldXp(0, xp); gatherXpRef.current += xp; gatherXpBonusRef.current += result.xpBonus; }}
      />
      <BattleModal
        visible={showBattle}
        npc={battleNpc}
        playerStats={getEffectiveStats(char)}
        playerLevel={char.level}
        onComplete={handleBattleComplete}
      />
      <BattleDropModal
        visible={showBattleDrops}
        npcName={battleDropNpcName}
        drops={battleDrops}
        onCollectAll={handleCollectBattleDrops}
        onClose={handleCloseBattleDrops}
        onListOnAh={handleListBattleDropOnAh}
      />

      {/* Offline / disconnected overlay — Modal so it renders above all RN modals.
          Show immediately when the device has no network (cold-start included).
          Use hasEverConnectedRef to gate WS-only disconnects so we don't flash
          the overlay on the initial connect attempt at boot. */}
      {(!isOnline || (hasEverConnectedRef.current && status !== "connected")) && (
        <OfflineOverlay />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.game.background },

  // ── Character header ──────────────────────────────────────────────────────
  characterCard: {
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: Colors.game.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.game.border,
  },
  charRow: { flexDirection: "row", alignItems: "center", gap: 12 },

  avatarWrap: { alignItems: "center", gap: 5 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.game.surfaceAlt,
    borderWidth: 2, borderColor: Colors.game.gold + "88",
    alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  levelBadge: {
    backgroundColor: Colors.game.gold + "22",
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: Colors.game.gold + "55",
  },
  levelBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.game.gold },

  charMeta: { flex: 1, gap: 2 },
  charName: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.game.text, letterSpacing: 0.2 },
  charScene: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
  xpRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  xpTrack: { flex: 1, height: 5, backgroundColor: Colors.game.border, borderRadius: 3, overflow: "hidden" },
  xpFill: { height: "100%", backgroundColor: Colors.game.purple, borderRadius: 3 },
  xpText: { fontSize: 9, fontFamily: "Inter_500Medium", color: Colors.game.textMuted },

  charRight: { alignItems: "flex-end", gap: 5 },
  charRightTop: { flexDirection: "row", justifyContent: "flex-end" },
  notifBtn: { position: "relative", padding: 2 },
  notifBadge: {
    position: "absolute", top: -3, right: -5,
    backgroundColor: Colors.game.red,
    borderRadius: 7, minWidth: 14, height: 14, paddingHorizontal: 2,
    alignItems: "center", justifyContent: "center",
  },
  notifBadgeText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#fff" },
  goldRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  goldIcon: { fontSize: 14 },
  goldValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  activityBadge: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  activityText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },

  // ── Content areas ─────────────────────────────────────────────────────────
  toastsWrap: { paddingHorizontal: 16, paddingTop: 6, gap: 4 },
  logWrap: { paddingHorizontal: 16, paddingTop: 6 },
  sceneWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 6 },
});
