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
      {/* ── Top: header + stat strip ──────────────────────────────────── */}
      <View style={[styles.topSection, { paddingTop: topPad + 12 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.mapTitle}>Mountain of Supremacy</Text>
        </View>
        <View style={styles.headerBtns}>
          <Pressable
            style={styles.headerBtn}
            onPress={() => setShowAuction(true)}
            hitSlop={4}
          >
            <Feather name="shopping-bag" size={20} color={Colors.game.gold} />
          </Pressable>
          <Pressable
            style={styles.headerBtn}
            onPress={() => setShowNotifications(true)}
            hitSlop={4}
          >
            <Feather name="bell" size={20} color={Colors.game.text} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={styles.headerBtn}
            onPress={() => setShowChat(true)}
            hitSlop={4}
          >
            <Feather name="message-circle" size={20} color={Colors.game.blue} />
          </Pressable>
          <Pressable style={styles.headerBtn} onPress={() => setShowStats(true)} hitSlop={4}>
            <Feather name="user" size={20} color={Colors.game.gold} />
            {char.pendingStatPoints > 0 && (
              <View style={styles.statsBadge}>
                <Text style={styles.statsBadgeText}>{char.pendingStatPoints}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={[styles.headerBtn, isAuthenticated && styles.headerBtnAuth]}
            onPress={() => setShowAuth(true)}
            hitSlop={4}
          >
            <Feather
              name={isAuthenticated ? "check-circle" : "key"}
              size={20}
              color={isAuthenticated ? Colors.game.green : Colors.game.textDim}
            />
          </Pressable>
        </View>

        {/* Quick gold + level strip */}
        <View style={styles.quickStrip}>
          <View style={styles.stripItem}>
            <View style={styles.goldCoin}>
              <Text style={styles.goldCoinText}>G</Text>
            </View>
            <Text style={styles.stripValue}>{char.gold.toLocaleString()}</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripLabel}>LV</Text>
            <Text style={styles.stripValue}>{char.level}</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItemXp}>
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
          {isAuthenticated && authUsername && (
            <>
              <View style={styles.stripDivider} />
              <View style={styles.stripItem}>
                <Feather name="check-circle" size={11} color={Colors.game.green} />
                <Text style={styles.stripUsername}>{authUsername}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* ── Middle spacer ─────────────────────────────────────────────── */}
      <View style={styles.midSpacer} />

      {/* ── Bottom: notification + scene + timer ──────────────────────── */}
      <View style={[styles.bottomSection, { paddingBottom: bottomPad + 16 }]}>
        {ahToasts.map((t) => <AhToast key={t.id} toast={t} />)}
        <EventLogStack logs={gameState.eventLog} />
        <SceneView
          scene={gameState.currentScene}
          artIndex={artIndex}
          onPress={handleScenePress}
          disabled={isInteracting}
        />
        <TimerBar
          isActive={isInteracting}
          duration={cooldownDuration}
          color={getActiveBuffMultiplier("Exploration") > 1 ? Colors.game.blueLight : undefined}
        />
      </View>

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
            const isTool = "sweepChance" in drop;
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
  topSection: { paddingHorizontal: 16, gap: 12 },
  midSpacer: { flex: 1, maxHeight: "28%" },
  bottomSection: { paddingHorizontal: 16, gap: 10 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  mapTitle: {
    fontSize: 18, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 0.4,
  },
  headerBtns: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  headerBtn: {
    padding: 8,
    backgroundColor: Colors.game.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.game.border,
    position: "relative",
  },
  headerBtnAuth: {
    borderColor: Colors.game.green + "55",
    backgroundColor: "rgba(34,197,94,0.06)",
  },
  statsBadge: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: Colors.game.purple,
    borderRadius: 8, width: 16, height: 16,
    alignItems: "center", justifyContent: "center",
  },
  statsBadgeText: {
    fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff",
  },
  bellBadge: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: Colors.game.red,
    borderRadius: 8, minWidth: 16, height: 16,
    paddingHorizontal: 3,
    alignItems: "center", justifyContent: "center",
  },
  bellBadgeText: {
    fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff",
  },
  quickStrip: {
    flexDirection: "row",
    backgroundColor: Colors.game.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.game.border,
    gap: 10,
  },
  stripItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  stripItemXp: { flex: 1, gap: 3 },
  goldCoin: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.game.gold,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#a07820",
  },
  goldCoinText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#3d2e00" },
  stripLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 1,
  },
  stripValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  stripDivider: { width: 1, height: 20, backgroundColor: Colors.game.border },
  xpTrack: {
    height: 4, backgroundColor: Colors.game.border,
    borderRadius: 2, overflow: "hidden",
  },
  xpFill: { height: "100%", backgroundColor: Colors.game.purple, borderRadius: 2 },
  xpText: { fontSize: 9, fontFamily: "Inter_500Medium", color: Colors.game.textMuted },
  stripUsername: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.green, letterSpacing: 0.5,
    maxWidth: 80,
  },
});
