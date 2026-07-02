import React, { useState, useMemo, useEffect } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { FantasyButton, OrnatePanel, RivetFrame, GemBar } from "@/components/ui";
import { MaterialEntry, RARITY_COLORS, RARITIES, useGame, MaterialType, ItemChest } from "@/context/GameContext";
import { useMultiplayer } from "@/context/MultiplayerContext";
import { Potion, GameItem, ITEM_RARITIES, ITEM_RARITY_COLORS, ITEM_QUALITY_COLORS } from "@/lib/items";
import { GatheringTool } from "@/lib/tools";
import { MaterialImage } from "./MaterialImage";
import { RarityText } from "./RarityText";
import { EquipmentTab } from "./EquipmentTab";
import { ChestImage } from "./ChestImage";
import { ChestOpenModal } from "./ChestOpenModal";
import { ItemBagModal } from "./ItemBagModal";
import { ItemImage } from "./ItemImage";
import { PotionImage } from "./PotionImage";
import { PotionBagModal } from "./PotionBagModal";
import { ToolsTab } from "./ToolsTab";

// ─── Config ───────────────────────────────────────────────────────────────────

interface StatsModalProps {
  visible: boolean;
  onClose: () => void;
  defaultTab?: "inventory" | "equipment" | "tools";
  onListOnAh?: (entry: MaterialEntry) => void;
  onListItemOnAh?: (item: GameItem) => void;
  onListChestOnAh?: (chest: ItemChest) => void;
  onListPotionOnAh?: (potion: Potion) => void;
  onListToolOnAh?: (tool: GatheringTool) => void;
}

const STAT_CONFIG = [
  { key: "strength" as const, label: "Strength", icon: "⚔", color: Colors.game.red, desc: "Damage per hit · +0.25 per level", bonus: "+1 STR" },
  { key: "health" as const, label: "Health", icon: "♥", color: Colors.game.green, desc: "HP points · +0.1 per level · max HP = pts × 10", bonus: "+10 HP" },
  { key: "defence" as const, label: "Defence", icon: "🛡", color: Colors.game.blue, desc: "Increases block chance", bonus: "+1 def" },
  { key: "speed" as const, label: "Speed", icon: "⚡", color: Colors.game.gold, desc: "Higher speed = more turns · +0.1 per level", bonus: "+1 SPD" },
];

const RARITY_DESC: Record<string, string> = {
  Common: "Widely found along the mountain road.",
  Uncommon: "Requires a keen eye to gather.",
  Rare: "Scarce and sought after by travelers.",
  Epic: "Powerful materials of unusual origin.",
  Elite: "Fierce rarity — few ever find these.",
  Legendary: "Storied materials of ancient power.",
  Superior: "Transcends ordinary classification.",
  Cosmic: "Touched by forces beyond understanding.",
};

const VERSION_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Standard", color: Colors.game.textMuted },
  1: { label: "Tier I", color: "#A78BFA" },
  2: { label: "Tier II", color: "#34D399" },
  3: { label: "Tier III", color: "#FCD34D" },
};

const TYPE_ICONS: Record<MaterialType, string> = {
  Ore: "⛏",
  Wood: "🪵",
  Herb: "🌿",
  Leather: "🔪",
  RubyShard: "💎",
};

const TYPE_COLORS: Record<MaterialType, string> = {
  Ore: "#A0A0A0",
  Wood: "#A07B3C",
  Herb: "#22C55E",
  Leather: "#CD853F",
  RubyShard: "#A855F7",
};

// ─── Item detail modal ────────────────────────────────────────────────────────

function ItemDetailModal({
  entry,
  onClose,
  onListOnAh,
}: {
  entry: MaterialEntry;
  onClose: () => void;
  onListOnAh?: (entry: MaterialEntry) => void;
}) {
  const { removeMaterial, convertRubyShards } = useGame();
  const { buyOrders, yourId, fillBuyOrder } = useMultiplayer();
  const rc = RARITY_COLORS[entry.material.rarity];
  const vInfo = VERSION_LABELS[entry.material.version] ?? VERSION_LABELS[0];
  const [sellQty, setSellQty] = useState(1);

  const matchingOrders = buyOrders.filter(
    (o) =>
      o.material.type === entry.material.type &&
      o.material.rarity === entry.material.rarity &&
      (o.material.version === null || o.material.version === entry.material.version) &&
      o.buyerId !== yourId &&
      o.count - o.filled > 0
  );
  const bestOrder = [...matchingOrders].sort((a, b) => b.pricePerUnit - a.pricePerUnit)[0] ?? null;
  const maxFill = bestOrder ? Math.min(entry.count, bestOrder.count - bestOrder.filled) : 0;
  const fillCount = Math.min(sellQty, maxFill);
  const quickSellGold = bestOrder ? fillCount * bestOrder.pricePerUnit : 0;

  useEffect(() => {
    setSellQty(1);
  }, [entry.key]);

  const handleQuickSell = () => {
    if (!bestOrder || fillCount <= 0) return;
    removeMaterial(entry.key, fillCount);
    fillBuyOrder(bestOrder.id, fillCount, entry.material.version);
    onClose();
  };

  return (
    <Modal transparent visible animationType="fade">
      <Pressable style={styles.detailOverlay} onPress={onClose}>
        <Pressable style={styles.detailCardWrap} onPress={(e) => e.stopPropagation()}>
          <OrnatePanel accent={rc} glow padding={18} contentStyle={styles.detailPanel}>
          <View style={styles.detailImgWrap}>
            <MaterialImage
              type={entry.material.type}
              rarity={entry.material.rarity}
              version={entry.material.version}
              size={96}
              compact={false}
              animateParticles={false}
            />
          </View>
          <View style={styles.detailInfo}>
            <RarityText
              rarity={entry.material.rarity}
              version={entry.material.version}
              label={`${entry.material.rarity} ${entry.material.type}`}
              style={styles.detailName}
            />
            <View style={styles.detailTagRow}>
              <View style={[styles.detailTag, { borderColor: rc }]}>
                <Text style={[styles.detailTagTxt, { color: rc }]}>{entry.material.type.toUpperCase()}</Text>
              </View>
              <View style={[styles.detailTag, { borderColor: vInfo.color }]}>
                <Text style={[styles.detailTagTxt, { color: vInfo.color }]}>{vInfo.label.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.detailDesc}>{RARITY_DESC[entry.material.rarity] ?? ""}</Text>
            <View style={styles.detailCountRow}>
              <Text style={styles.detailCountLabel}>IN INVENTORY</Text>
              <Text style={[styles.detailCount, { color: rc }]}>×{entry.count}</Text>
            </View>
          </View>

          {/* Ruby Shard conversion */}
          {entry.material.type === "RubyShard" && entry.count >= 30 && (
            <FantasyButton variant="amethyst" fullWidth onPress={() => { convertRubyShards(); onClose(); }}>
              <View style={styles.detailBtnStack}>
                <Text style={styles.quickSellTxt}>
                  💎 CONVERT {Math.floor(entry.count / 30) * 30} SHARDS → {Math.floor(entry.count / 30)} RUBIES
                </Text>
                <Text style={styles.quickSellSub}>30 shards = 1 ruby</Text>
              </View>
            </FantasyButton>
          )}

          {/* Quick Sell quantity selector */}
          {bestOrder && (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <Pressable
                  style={[styles.qtyBtn, sellQty <= 1 && styles.qtyBtnDisabled]}
                  onPress={() => setSellQty((q) => Math.max(1, q - 1))}
                  disabled={sellQty <= 1}
                >
                  <Text style={styles.qtyBtnTxt}>−</Text>
                </Pressable>
                <Text style={styles.qtyValue}>×{sellQty}</Text>
                <Pressable
                  style={[styles.qtyBtn, sellQty >= entry.count && styles.qtyBtnDisabled]}
                  onPress={() => setSellQty((q) => Math.min(entry.count, q + 1))}
                  disabled={sellQty >= entry.count}
                >
                  <Text style={styles.qtyBtnTxt}>+</Text>
                </Pressable>
              </View>
              <FantasyButton variant="emerald" fullWidth onPress={handleQuickSell}>
                <View style={styles.detailBtnStack}>
                  <Text style={styles.quickSellTxt}>
                    ⚡ QUICK SELL ×{fillCount}  ·  {quickSellGold.toLocaleString()}G
                  </Text>
                  <Text style={styles.quickSellSub}>Best buy order — {bestOrder.pricePerUnit}G each · by {bestOrder.buyerName}</Text>
                </View>
              </FantasyButton>
            </View>
          )}

          {/* List on AH */}
          {onListOnAh && (
            <FantasyButton
              variant="gold"
              size="sm"
              fullWidth
              icon="pricetag"
              label="LIST ON AUCTION HOUSE"
              onPress={() => onListOnAh(entry)}
            />
          )}

          <FantasyButton variant="dark" size="sm" fullWidth icon="close" label="CLOSE" onPress={onClose} />
          </OrnatePanel>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Batch result modal ──────────────────────────────────────────────────────

export function BatchResultModal({
  result,
  onClose,
}: {
  result: {
    open: boolean;
    action: "salvage" | "sell";
    count: number;
    totalGold: number;
    items: { name: string; rarity: string; slot: string; gold?: number; mats?: string }[];
  };
  onClose: () => void;
}) {
  const title = result.action === "salvage" ? "Salvage Results" : "Sell Results";
  const accent = result.action === "salvage" ? Colors.game.blue : Colors.game.ember;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={brm.overlay}>
        <OrnatePanel accent={accent} glow corners style={{ width: "90%", maxWidth: 380 }}>
          <View style={brm.card}>
            <Text style={[brm.title, { color: accent }]}>{title}</Text>
            <Text style={brm.summary}>
              {result.action === "salvage"
                ? `${result.count} item${result.count !== 1 ? "s" : ""} salvaged`
                : `${result.count} item${result.count !== 1 ? "s" : ""} sold for ${result.totalGold.toLocaleString()}g`}
            </Text>

            <ScrollView style={brm.list} showsVerticalScrollIndicator={false}>
              {result.items.map((it, idx) => (
                <View key={idx} style={brm.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={brm.itemName}>{it.name}</Text>
                    <Text style={brm.itemMeta}>
                      {it.rarity} {it.slot}
                    </Text>
                  </View>
                  {result.action === "sell" && it.gold != null && (
                    <Text style={[brm.itemGold, { color: Colors.game.goldLight }]}>+{it.gold.toLocaleString()}g</Text>
                  )}
                  {result.action === "salvage" && it.mats && (
                    <Text style={[brm.itemMats, { color: Colors.game.blueLight }]}>{it.mats}</Text>
                  )}
                </View>
              ))}
            </ScrollView>

            <FantasyButton
              fullWidth
              variant="dark"
              icon="close"
              label="CLOSE"
              onPress={onClose}
            />
          </View>
        </OrnatePanel>
      </View>
    </Modal>
  );
}

const brm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    padding: 16,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: 1,
  },
  summary: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    textAlign: "center",
    marginBottom: 4,
  },
  list: {
    maxHeight: 280,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.game.border,
  },
  itemName: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.game.text,
  },
  itemMeta: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
  },
  itemGold: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  itemMats: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    flexShrink: 1,
    textAlign: "right",
  },
});

// ─── Profile tab sub-component ───────────────────────────────────────────────
// ─── Main modal ───────────────────────────────────────────────────────────────

export function StatsModal({ visible, onClose, defaultTab = "inventory", onListOnAh, onListItemOnAh, onListChestOnAh, onListPotionOnAh, onListToolOnAh }: StatsModalProps) {
  const { gameState, addItemToBag, addPotionToBag, removeChestFromBag, equipItem, removeItemFromBag, consumePotion, removePotionFromBag, addToolToBag, salvageItem, sellItemToNpc } = useGame();
  const char = gameState.character;
  const [selectedEntry, setSelectedEntry] = useState<MaterialEntry | null>(null);
  const [selectedChest, setSelectedChest] = useState<ItemChest | null>(null);
  const [selectedBagItem, setSelectedBagItem] = useState<GameItem | null>(null);
  const [selectedPotion, setSelectedPotion] = useState<Potion | null>(null);
  const [activeTab, setActiveTab] = useState<"inventory" | "equipment" | "tools">("inventory");

  // Sync tab when modal opens with a new defaultTab
  useEffect(() => {
    if (visible && defaultTab) setActiveTab(defaultTab);
  }, [visible, defaultTab]);
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set(["Wood", "Ore", "Herb", "Leather", "Chests", "Potions", "Weapon", "Armor", "Boots", "Helmet", "Amulet", "Ring"]));
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const toggleSlot = (slot: string) => {
    setExpandedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  };

  const exitMultiSelect = () => { setMultiSelectMode(false); setSelectedItemIds(new Set()); };

  const toggleItemSelect = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const [batchResult, setBatchResult] = useState<{
    open: boolean;
    action: "salvage" | "sell";
    count: number;
    totalGold: number;
    items: { name: string; rarity: string; slot: string; gold?: number; mats?: string }[];
  } | null>(null);

  const handleBatchSalvage = () => {
    const items: { name: string; rarity: string; slot: string; mats?: string }[] = [];
    let count = 0;
    selectedItemIds.forEach(id => {
      const item = char.itemBag.find(i => i.id === id);
      if (!item) return;
      const result = salvageItem(id);
      count++;
      const matSummary = result?.materials.map(m => `${m.count} ${m.rarity} ${m.type}`).join(", ") ?? "none";
      items.push({ name: item.name, rarity: item.rarity, slot: item.slot, mats: matSummary });
    });
    exitMultiSelect();
    setBatchResult({ open: true, action: "salvage", count, totalGold: 0, items });
  };
  const handleBatchSellNpc = () => {
    const items: { name: string; rarity: string; slot: string; gold: number }[] = [];
    let total = 0;
    selectedItemIds.forEach(id => {
      const item = char.itemBag.find(i => i.id === id);
      if (!item) return;
      const g = sellItemToNpc(id);
      if (g) {
        total += g;
        items.push({ name: item.name, rarity: item.rarity, slot: item.slot, gold: g });
      }
    });
    exitMultiSelect();
    setBatchResult({ open: true, action: "sell", count: items.length, totalGold: total, items });
  };

  const selectAll = () => {
    setSelectedItemIds(new Set((char.itemBag ?? []).map(i => i.id)));
  };

  // Group inventory by material type, sort each group by rarity (highest first)
  const groupedInventory = useMemo(() => {
    const groups: Record<MaterialType, MaterialEntry[]> = {
      Ore: [], Wood: [], Herb: [], Leather: [], RubyShard: [],
    };
    for (const entry of char.materials) {
      groups[entry.material.type]?.push(entry);
    }
    for (const type of Object.keys(groups) as MaterialType[]) {
      groups[type].sort((a, b) => {
        const aIdx = RARITIES.indexOf(a.material.rarity);
        const bIdx = RARITIES.indexOf(b.material.rarity);
        return bIdx - aIdx;
      });
    }
    return groups;
  }, [char.materials]);

  const totalItems = char.materials.length + (char.chestBag?.length ?? 0) + (char.itemBag?.length ?? 0) + (char.potionBag?.length ?? 0);
  const chestStacks = useMemo(() => {
    const stacks = new Map<string, { rep: ItemChest; count: number }>();
    for (const c of char.chestBag ?? []) {
      const key = `${c.rarity}-${c.tier}`;
      if (!stacks.has(key)) stacks.set(key, { rep: c, count: 0 });
      stacks.get(key)!.count++;
    }
    return Array.from(stacks.values());
  }, [char.chestBag]);

  const potionStacks = useMemo(() => {
    const stacks = new Map<string, { rep: Potion; count: number }>();
    for (const p of char.potionBag ?? []) {
      // Guard: skip any non-Potion objects that may have ended up in potionBag
      if (!("effectPercent" in p)) continue;
      const key = `${p.type}|${p.rarity}|${p.tier}`;
      if (!stacks.has(key)) stacks.set(key, { rep: p as Potion, count: 0 });
      stacks.get(key)!.count++;
    }
    return Array.from(stacks.values());
  }, [char.potionBag]);
  const handleListOnAhFromDetail = (entry: MaterialEntry) => {
    setSelectedEntry(null);
    onListOnAh?.(entry);
  };

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.overlay}>
        <LinearGradient
          colors={Colors.grad.panel}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.sheet}
        >
          <View style={styles.handle} />

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <View style={styles.tabBar}>
            <FantasyButton
              style={styles.tabFlex}
              textStyle={styles.tabTxt}
              size="sm"
              variant={activeTab === "inventory" ? "gold" : "dark"}
              label={`ITEMS ${totalItems > 0 ? `(${totalItems})` : ""}`}
              onPress={() => setActiveTab("inventory")}
            />
            <FantasyButton
              style={styles.tabFlex}
              textStyle={styles.tabTxt}
              size="sm"
              variant={activeTab === "equipment" ? "gold" : "dark"}
              label={`GEAR ${Object.keys(char.equippedItems).length > 0 ? `(${Object.keys(char.equippedItems).length})` : ""}`}
              onPress={() => setActiveTab("equipment")}
            />
            <FantasyButton
              style={styles.tabFlex}
              textStyle={styles.tabTxt}
              size="sm"
              variant={activeTab === "tools" ? "gold" : "dark"}
              label={`TOOLS ${((char.toolBag?.length ?? 0) + Object.keys(char.equippedTools ?? {}).length) > 0 ? `(${(char.toolBag?.length ?? 0) + Object.keys(char.equippedTools ?? {}).length})` : ""}`}
              onPress={() => setActiveTab("tools")}
            />
          </View>

          {/* ── Equipment tab ───────────────────────────────────────────── */}
          {activeTab === "equipment" && (
            <View style={styles.tabContent}>
              <EquipmentTab />
            </View>
          )}

          {/* ── Inventory tab ───────────────────────────────────────────── */}
          {activeTab === "inventory" && (
            <View style={{ flex: 1 }}>

            {/* ── Batch action bar (multi-select mode) ── */}
            {multiSelectMode && (
              <View style={styles.batchBar}>
                <Pressable onPress={selectedItemIds.size === (char.itemBag?.length ?? 0) ? exitMultiSelect : selectAll}>
                  <Text style={styles.batchCount}>
                    {selectedItemIds.size > 0 ? `${selectedItemIds.size} selected` : "Tap items to select"}
                  </Text>
                </Pressable>
                <View style={{ flex: 1 }} />
                <FantasyButton
                  size="sm"
                  variant="sapphire"
                  icon="construct"
                  label="SALVAGE"
                  onPress={handleBatchSalvage}
                  disabled={selectedItemIds.size === 0}
                />
                <FantasyButton
                  size="sm"
                  variant="ember"
                  icon="cash"
                  label="SELL NPC"
                  onPress={handleBatchSellNpc}
                  disabled={selectedItemIds.size === 0}
                />
                <FantasyButton
                  size="sm"
                  variant="dark"
                  icon="close"
                  onPress={exitMultiSelect}
                />
              </View>
            )}

            {/* ── Batch result modal ── */}
            {batchResult?.open && (
              <BatchResultModal
                result={batchResult}
                onClose={() => setBatchResult(null)}
              />
            )}

            <ScrollView style={styles.tabContent} contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              {totalItems === 0 ? (
                <View style={styles.emptyInv}>
                  <Text style={styles.emptyInvText}>Your inventory is empty.</Text>
                  <Text style={styles.emptyInvSub}>Gather materials by exploring the mountain.</Text>
                </View>
              ) : (
                <View style={{ flexDirection: "column", gap: 0 }}>
                  {/* ── Materials ── */}
                  {(Object.keys(groupedInventory) as MaterialType[]).map((type) => {
                    const entries = groupedInventory[type];
                    if (entries.length === 0) return null;
                    const typeColor = TYPE_COLORS[type];
                    return (
                      <View key={type} style={styles.typeSection}>
                        <Pressable style={[styles.typeHeader, { borderColor: typeColor }]} onPress={() => toggleSlot(type)}>
                          <Text style={[styles.typeHeaderIcon, { color: typeColor }]}>{TYPE_ICONS[type]}</Text>
                          <Text style={[styles.typeHeaderName, { color: typeColor }]}>{type.toUpperCase()}</Text>
                          <View style={[styles.typeHeaderBadge, { backgroundColor: typeColor }]}>
                            <Text style={styles.typeHeaderBadgeText}>×{entries.reduce((s, e) => s + e.count, 0)}</Text>
                          </View>
                          <Ionicons name={expandedSlots.has(type) ? "chevron-down" : "chevron-forward"} size={13} color={Colors.game.textDim} style={styles.chevronIcon} />
                        </Pressable>
                        {expandedSlots.has(type) && (
                        <View style={styles.inventoryGrid}>
                          {entries.map((entry) => {
                            const rc = RARITY_COLORS[entry.material.rarity];
                            return (
                              <Pressable key={entry.key} style={styles.invSlotWrap} onPress={() => setSelectedEntry(entry)}>
                                <RivetFrame color={rc}>
                                  <MaterialImage type={entry.material.type} rarity={entry.material.rarity} version={entry.material.version} size={68} compact animateParticles={false} />
                                </RivetFrame>
                                <View style={[styles.countBadge, { backgroundColor: rc }]}>
                                  <Text style={styles.countText} numberOfLines={1}>×{entry.count}</Text>
                                </View>
                                <View style={styles.typeLabel}>
                                  <Text style={[styles.typeLabelText, { color: rc }]} adjustsFontSizeToFit minimumFontScale={0.7}>
                                    {entry.material.rarity}{entry.material.version > 0 ? ` T${entry.material.version}` : ""}
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })}
                        </View>)}
                      </View>
                    );
                  })}

                  {/* ── Chests ── */}
                  {chestStacks.length > 0 && (
                    <View style={styles.typeSection}>
                      <Pressable style={[styles.typeHeader, { borderColor: Colors.game.gold }]} onPress={() => toggleSlot("Chests")}>
                        <Text style={[styles.typeHeaderIcon, { color: Colors.game.gold }]}>📦</Text>
                        <Text style={[styles.typeHeaderName, { color: Colors.game.gold }]}>CHESTS</Text>
                        <View style={[styles.typeHeaderBadge, { backgroundColor: Colors.game.gold }]}>
                          <Text style={styles.typeHeaderBadgeText}>×{chestStacks.reduce((s, { count }) => s + count, 0)}</Text>
                        </View>
                        <Ionicons name={expandedSlots.has("Chests") ? "chevron-down" : "chevron-forward"} size={13} color={Colors.game.textDim} style={styles.chevronIcon} />
                      </Pressable>
                      {expandedSlots.has("Chests") && (
                      <View style={styles.inventoryGrid}>
                        {chestStacks.map(({ rep, count }) => {
                          const rc = ITEM_RARITY_COLORS[rep.rarity];
                          return (
                            <Pressable key={`${rep.rarity}-${rep.tier}`} style={styles.invSlotWrap} onPress={() => setSelectedChest(rep)}>
                              <RivetFrame color={rc}>
                                <ChestImage rarity={rep.rarity} size={68} compact />
                              </RivetFrame>
                              <View style={[styles.countBadge, { backgroundColor: rc }]}>
                                <Text style={styles.countText} numberOfLines={1}>×{count}</Text>
                              </View>
                              <View style={styles.typeLabel}>
                                <Text style={[styles.typeLabelText, { color: rc }]} adjustsFontSizeToFit minimumFontScale={0.7}>
                                  {rep.rarity}{"\n"}T{rep.tier}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>)}
                    </View>
                  )}

                  {/* ── Potions ── */}
                  {potionStacks.length > 0 && (
                    <View style={styles.typeSection}>
                      <Pressable style={[styles.typeHeader, { borderColor: Colors.game.purpleLight }]} onPress={() => toggleSlot("Potions")}>
                        <Text style={[styles.typeHeaderIcon, { color: Colors.game.purpleLight }]}>⚗</Text>
                        <Text style={[styles.typeHeaderName, { color: Colors.game.purpleLight }]}>POTIONS</Text>
                        <View style={[styles.typeHeaderBadge, { backgroundColor: Colors.game.purpleLight }]}>
                          <Text style={styles.typeHeaderBadgeText}>×{char.potionBag.length}</Text>
                        </View>
                        <Ionicons name={expandedSlots.has("Potions") ? "chevron-down" : "chevron-forward"} size={13} color={Colors.game.textDim} style={styles.chevronIcon} />
                      </Pressable>
                      {expandedSlots.has("Potions") && (
                        <View style={styles.inventoryGrid}>
                          {potionStacks.map(({ rep, count }) => {
                            const rc = ITEM_RARITY_COLORS[rep.rarity];
                            return (
                              <Pressable key={`${rep.type}|${rep.rarity}|${rep.tier}`} style={styles.invSlotWrap} onPress={() => setSelectedPotion(rep)}>
                                <RivetFrame color={rc}>
                                  <PotionImage type={rep.type} rarity={rep.rarity} tier={rep.tier} size={68} compact />
                                </RivetFrame>
                                <View style={[styles.countBadge, { backgroundColor: rc }]}>
                                  <Text style={styles.countText} numberOfLines={1}>×{count}</Text>
                                </View>
                                <View style={styles.typeLabel}>
                                  <Text style={[styles.typeLabelText, { color: rc }]} adjustsFontSizeToFit minimumFontScale={0.7}>
                                    {rep.type}
                                  </Text>
                                  <Text style={[styles.typeLabelText, { color: Colors.game.textDim }]} adjustsFontSizeToFit minimumFontScale={0.7}>
                                    {rep.rarity} · T{rep.tier}
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}

                  {/* ── Equipment ── */}
                  {(char.itemBag?.length ?? 0) > 0 && (() => {
                    const slots = ["Weapon", "Armor", "Boots", "Helmet", "Amulet", "Ring"];
                    const slotIcons: Record<string, string> = { Weapon: "⚔", Armor: "🛡", Boots: "👢", Helmet: "⛑", Amulet: "📿", Ring: "💍" };
                    const slotColors: Record<string, string> = { Weapon: Colors.game.red, Armor: Colors.game.blue, Boots: "#D4A574", Helmet: "#A0A0A0", Amulet: Colors.game.purpleLight, Ring: Colors.game.gold };
                    const bySlot = new Map<string, GameItem[]>();
                    for (const s of slots) bySlot.set(s, []);
                    for (const item of char.itemBag!) bySlot.get(item.slot)!.push(item);
                    for (const items of bySlot.values()) {
                      items.sort((a, b) => {
                        const ra = ITEM_RARITIES.indexOf(a.rarity);
                        const rb = ITEM_RARITIES.indexOf(b.rarity);
                        if (rb !== ra) return rb - ra;
                        return b.tier - a.tier;
                      });
                    }
                    return (
                      <>
                        {slots.map((slot) => {
                          const items = bySlot.get(slot) ?? [];
                          if (items.length === 0) return null;
                          const slotColor = slotColors[slot] ?? Colors.game.purpleLight;
                          const isOpen = expandedSlots.has(slot);
                          return (
                            <View key={slot} style={styles.typeSection}>
                              <Pressable style={[styles.typeHeader, { borderColor: slotColor }]} onPress={() => toggleSlot(slot)}>
                                <Text style={[styles.typeHeaderIcon, { color: slotColor }]}>{slotIcons[slot]}</Text>
                                <Text style={[styles.typeHeaderName, { color: slotColor }]}>{slot.toUpperCase()}</Text>
                                <View style={[styles.typeHeaderBadge, { backgroundColor: slotColor }]}>
                                  <Text style={styles.typeHeaderBadgeText}>×{items.length}</Text>
                                </View>
                                <Ionicons name={isOpen ? "chevron-down" : "chevron-forward"} size={13} color={Colors.game.textDim} style={styles.chevronIcon} />
                              </Pressable>
                              {isOpen && (
                                <View style={styles.inventoryGrid}>
                                  {items.map((item) => {
                                    const rc = ITEM_RARITY_COLORS[item.rarity];
                                    const qc = ITEM_QUALITY_COLORS[item.quality];
                                    return (
                                      <Pressable
                                        key={item.id}
                                        style={[styles.invSlotWrap, multiSelectMode && selectedItemIds.has(item.id) && styles.invSlotWrapSelected]}
                                        onPress={() => multiSelectMode ? toggleItemSelect(item.id) : setSelectedBagItem(item)}
                                      >
                                        <RivetFrame
                                          color={multiSelectMode && selectedItemIds.has(item.id) ? Colors.game.green : rc}
                                          style={multiSelectMode && selectedItemIds.has(item.id) ? { borderWidth: 3 } : undefined}
                                        >
                                          <ItemImage slot={item.slot} rarity={item.rarity} quality={item.quality} tier={item.tier} size={68} compact />
                                          {multiSelectMode && (
                                            <View style={[styles.checkOverlay, selectedItemIds.has(item.id) && styles.checkOverlayActive]}>
                                              {selectedItemIds.has(item.id) && <Text style={styles.checkMark}>✓</Text>}
                                            </View>
                                          )}
                                        </RivetFrame>
                                        <View style={[styles.countBadge, { backgroundColor: rc }]}>
                                          <Text style={styles.countText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                                            T{item.tier} · {item.quality}
                                          </Text>
                                        </View>
                                        <View style={styles.typeLabel}>
                                          <Text style={[styles.typeLabelText, { color: rc }]} adjustsFontSizeToFit minimumFontScale={0.7}>
                                            {item.name}
                                          </Text>
                                          <Text style={[styles.typeLabelText, { color: qc }]} adjustsFontSizeToFit minimumFontScale={0.7}>
                                            {item.stats.strength > 0 && `⚔${item.stats.strength} `}{item.stats.health > 0 && `♥${item.stats.health} `}{item.stats.defence > 0 && `🛡${item.stats.defence} `}{item.stats.speed > 0 && `⚡${item.stats.speed} `}
                                          </Text>
                                        </View>
                                      </Pressable>
                                    );
                                  })}
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </>
                    );
                  })()}

                  <View style={{ height: 24 }} />
                </View>
              )}
            </ScrollView>

            {/* ── Select toggle button ── */}
            {(char.itemBag?.length ?? 0) > 0 && (
              <FantasyButton
                style={styles.selectToggleBtn}
                textStyle={styles.selectToggleTxt}
                size="sm"
                fullWidth
                variant={multiSelectMode ? "emerald" : "dark"}
                icon={multiSelectMode ? "checkmark-done" : "checkbox-outline"}
                label={multiSelectMode
                  ? `${selectedItemIds.size} of ${char.itemBag?.length ?? 0} selected — tap to deselect all`
                  : "SELECT ITEMS FOR BATCH ACTION"}
                onPress={() => multiSelectMode ? exitMultiSelect() : setMultiSelectMode(true)}
              />
            )}

            </View>
          )}

          {/* ── Tools tab ─────────────────────────────────────────────── */}
          {activeTab === "tools" && (
            <View style={styles.tabContent}>
              <ToolsTab onListOnAh={onListToolOnAh} />
            </View>
          )}

          <FantasyButton
            style={styles.closeBtn}
            size="md"
            fullWidth
            variant="dark"
            icon="close"
            label="CLOSE"
            onPress={onClose}
          />
        </LinearGradient>
      </View>

      {selectedEntry && (
        <ItemDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onListOnAh={onListOnAh ? handleListOnAhFromDetail : undefined}
        />
      )}

      {selectedChest && (
        <ChestOpenModal
          chest={selectedChest}
          onClaim={(drop) => {
            if ("passiveChance" in drop) {
              addToolToBag(drop as any);
            } else if ("slot" in drop) {
              addItemToBag(drop);
            } else {
              addPotionToBag(drop as any);
            }
            removeChestFromBag(selectedChest.id);
            setSelectedChest(null);
          }}
          onClose={() => setSelectedChest(null)}
          onSellOnAh={onListChestOnAh && selectedChest.tradable ? () => {
            const c = selectedChest;
            setSelectedChest(null);
            onListChestOnAh(c);
          } : undefined}
          onEquipItem={(item) => {
            addItemToBag(item);
            equipItem(item);
            removeItemFromBag(item.id);
            removeChestFromBag(selectedChest!.id);
            setSelectedChest(null);
          }}
          onSalvageItem={(item) => {
            salvageItem(item.id, item);
            removeChestFromBag(selectedChest!.id);
            setSelectedChest(null);
          }}
          onSellItemToNpc={(item) => {
            sellItemToNpc(item.id, item);
            removeChestFromBag(selectedChest!.id);
            setSelectedChest(null);
          }}
          onConsumePotion={(potion) => {
            addPotionToBag(potion as any);
            consumePotion(potion);
            removeChestFromBag(selectedChest!.id);
            setSelectedChest(null);
          }}
        />
      )}

      {selectedBagItem && (
        <ItemBagModal
          item={selectedBagItem}
          onClose={() => setSelectedBagItem(null)}
          onEquip={() => {
            equipItem(selectedBagItem);
            removeItemFromBag(selectedBagItem.id);
            setSelectedBagItem(null);
          }}
          onSellOnAh={onListItemOnAh ? () => {
            const item = selectedBagItem;
            setSelectedBagItem(null);
            onListItemOnAh(item);
          } : undefined}
          onSalvage={() => {
            setSelectedBagItem(null);
          }}
          onSellToNpc={() => {
            sellItemToNpc(selectedBagItem.id);
            setSelectedBagItem(null);
          }}
        />
      )}

      {selectedPotion && (
        <PotionBagModal
          potion={selectedPotion}
          onClose={() => setSelectedPotion(null)}
          onConsume={() => {
            consumePotion(selectedPotion);
            setSelectedPotion(null);
          }}
          onSellOnAh={onListPotionOnAh && selectedPotion.tradable ? () => {
            const p = selectedPotion;
            setSelectedPotion(null);
            onListPotionOnAh(p);
          } : undefined}
        />
      )}
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(7,4,9,0.8)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
    flex: 1,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.game.gold + "55",
  },
  handle: {
    width: 44, height: 4,
    backgroundColor: Colors.game.gold + "66",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },

  // Tabs
  tabBar: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  tabFlex: {
    flex: 1,
  },
  tabTxt: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  tabContent: {
    flex: 1,
    minHeight: 300,
  },
  profileContent: {
    paddingBottom: 24,
  },

  // Profile
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  onlineRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginBottom: 12, paddingVertical: 8,
    paddingHorizontal: 12, borderRadius: 12,
    backgroundColor: Colors.game.surface,
    borderWidth: 1, borderColor: Colors.game.gold + "22",
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineStatus: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.game.textDim },
  onlineActionBtn: {
    borderRadius: 8, borderWidth: 1,
    borderColor: Colors.game.border,
    paddingHorizontal: 9, paddingVertical: 5,
  },
  onlineActionTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.game.textDim },
  lifetimeRow: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 12, borderRadius: 12,
    backgroundColor: Colors.game.surface,
    borderWidth: 1, borderColor: Colors.game.gold + "22",
    overflow: "hidden",
  },
  lifetimeStat: { flex: 1, alignItems: "center", paddingVertical: 12, gap: 3 },
  lifetimeDivider: { width: 1, height: "100%", backgroundColor: Colors.game.border },
  lifetimeVal: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  lifetimeLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.game.textMuted, letterSpacing: 0.5 },
  nameLabel: {
    fontSize: 10, fontFamily: "Inter_600SemiBold",
    color: Colors.game.textMuted, letterSpacing: 2,
  },
  levelRow: { flexDirection: "row", alignItems: "baseline" },
  lvLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
  lvValue: { fontSize: 34, fontFamily: "Inter_700Bold", color: Colors.game.gold, lineHeight: 38 },
  goldBlock: { flexDirection: "row", alignItems: "center", gap: 7 },
  goldCoin: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.game.gold,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#a07820",
  },
  goldCoinText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#3d2e00" },
  goldVal: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  xpRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  xpGem: {
    width: 18, height: 18, borderRadius: 4,
    backgroundColor: Colors.game.purple,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#6b21a8",
  },
  xpGemText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#e9d5ff" },
  xpTrack: {
    flex: 1,
  },
  nameBanner: { marginBottom: 6, alignSelf: "flex-start" },
  chevronIcon: { marginLeft: 4 },
  xpNums: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.game.textMuted },
  pendingBanner: {
    backgroundColor: "rgba(128,96,192,0.15)",
    borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: Colors.game.purple,
    alignItems: "center", marginBottom: 6,
  },
  buffBadge: {
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  buffText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  pendingText: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.game.purpleLight },
  divider: { height: 1, backgroundColor: Colors.game.border, marginVertical: 8 },
  statGrid: { gap: 10, marginBottom: 16 },
  statCard: {
    backgroundColor: Colors.game.surface,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.game.gold + "22", gap: 8,
  },
  statCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  statIcon: { fontSize: 20 },
  statInfo: { flex: 1 },
  statName: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statDesc: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },
  statDerived: { fontSize: 10, fontFamily: "Inter_500Medium", opacity: 0.75, marginTop: 2 },
  statVal: { fontSize: 26, fontFamily: "Inter_700Bold" },
  allocBtn: {
    borderWidth: 1, borderRadius: 8,
    paddingVertical: 7, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  allocBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },

  // Inventory empty state
  emptyInv: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 60,
  },
  emptyInvText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
  },
  emptyInvSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
  },

  // Type sections
  typeSection: {
    marginBottom: 18,
    gap: 10,
  },
  // Multi-select batch action UI
  batchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: Colors.game.surfaceAlt,
    borderBottomWidth: 1, borderBottomColor: Colors.game.border,
  },
  batchCount: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.game.textDim },
  batchBtn: {
    borderRadius: 8, borderWidth: 1.5,
    paddingHorizontal: 10, paddingVertical: 6,
    alignItems: "center",
  },
  batchBtnDisabled: { opacity: 0.35 },
  batchBtnTxt: { fontSize: 10, fontFamily: "Inter_700Bold" },
  selectToggleBtn: {
    marginTop: 10,
  },
  selectToggleTxt: { fontSize: 10, letterSpacing: 0.8 },
  batchMsgBar: {
    backgroundColor: "rgba(34,197,94,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(34,197,94,0.25)",
    alignItems: "center",
  },
  batchMsgText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.game.green,
  },
  invSlotWrapSelected: { opacity: 0.9 },
  checkOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  checkOverlayActive: { backgroundColor: "rgba(0,0,0,0.45)" },
  checkMark: { fontSize: 24, color: Colors.game.green, fontFamily: "Inter_700Bold" },

  typeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: Colors.game.surface,
  },
  typeHeaderIcon: { fontSize: 16 },
  typeHeaderName: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    flex: 1,
  },
  typeHeaderBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: "center",
  },
  typeHeaderBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
  inventoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  invSlotWrap: { alignItems: "center", gap: 4 },
  countBadge: {
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
    minWidth: 24, alignItems: "center",
  },
  countText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#000" },
  typeLabel: { alignItems: "center", width: 72 },
  typeLabelText: {
    fontSize: 9, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 0.5, textAlign: "center",
  },

  // Equipment slot sections
  equipSlotSection: { marginBottom: 10, gap: 6 },
  equipSlotHeader: {
    flexDirection: "row", alignItems: "center",
    gap: 8, paddingHorizontal: 4, paddingVertical: 6,
  },
  equipSlotIcon: { fontSize: 14 },
  equipSlotName: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 1.5, flex: 1,
  },
  equipSlotCount: {
    fontSize: 10, fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  equipSlotChevron: {
    fontSize: 10, color: Colors.game.textDim,
    marginLeft: 4,
  },
  equipRarityGroup: { marginBottom: 6 },
  equipRarityHeader: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 4, paddingHorizontal: 6,
    borderBottomWidth: 1, marginBottom: 4,
  },
  equipRarityHeaderText: {
    fontSize: 9, fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  equipCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.game.surface,
    borderRadius: 14, borderWidth: 1,
    paddingVertical: 8, paddingHorizontal: 10, gap: 12,
  },
  equipCardImg: { alignItems: "center", justifyContent: "center" },
  equipCardRight: { flex: 1, gap: 5 },
  equipTagRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  equipTag: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 5, borderWidth: 1,
  },
  equipTagText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  equipCardName: {
    fontSize: 13, fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  equipStatRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  equipStatText: { fontSize: 10, fontFamily: "Inter_500Medium" },

  // Section-based inventory grid
  sectionBlock: {
    marginBottom: 12,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: Colors.game.surface,
  },
  sectionIcon: { fontSize: 16 },
  sectionName: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    flex: 1,
  },
  sectionCount: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  sectionChevron: {
    fontSize: 10,
    color: Colors.game.textDim,
    marginLeft: 4,
  },
  sectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  equipSubSection: {
    marginBottom: 8,
    gap: 6,
  },
  equipSubHeader: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 1.2,
    paddingHorizontal: 4,
  },
  compactCell: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.game.surface,
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  compactCellImg: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.game.surfaceAlt,
  },
  compactCellLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  compactCellSub: {
    fontSize: 8,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  compactCellBadge: {
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  compactCellBadgeText: {
    fontSize: 7,
    fontFamily: "Inter_700Bold",
    color: "#000",
    textAlign: "center",
  },

  closeBtn: {
    marginTop: 10,
  },

  // Item detail
  detailOverlay: {
    flex: 1, backgroundColor: "rgba(7,4,9,0.8)",
    justifyContent: "center", alignItems: "center",
    padding: 24,
  },
  detailCardWrap: {
    width: "100%", maxWidth: 340,
  },
  detailPanel: { gap: 12 },
  detailBtnStack: { alignItems: "center", gap: 3 },
  detailImgWrap: { alignItems: "center", marginBottom: 4 },
  detailInfo: { gap: 8 },
  detailName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  detailTagRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  detailTag: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  detailTagTxt: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  detailDesc: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.game.textDim, lineHeight: 18,
  },
  detailCountRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.game.border,
  },
  detailCountLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 2,
  },
  detailCount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  quickSellBtn: {
    backgroundColor: "rgba(34,197,94,0.10)", borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, gap: 3,
    borderWidth: 1, borderColor: Colors.game.green,
    alignItems: "center",
  },
  quickSellTxt: {
    fontSize: 12, fontFamily: "Inter_700Bold",
    color: "#E6FFEE", letterSpacing: 1, textAlign: "center",
  },
  quickSellSub: {
    fontSize: 10, fontFamily: "Inter_400Regular",
    color: "#C8E8D2", textAlign: "center",
  },
  qtyBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: Colors.game.surfaceAlt,
    borderWidth: 1, borderColor: Colors.game.border,
    alignItems: "center", justifyContent: "center",
  },
  qtyBtnDisabled: { opacity: 0.35 },
  qtyBtnTxt: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.game.text },
  qtyValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.game.text, minWidth: 36, textAlign: "center" },
  listAhBtn: {
    backgroundColor: "rgba(201,168,76,0.10)", borderRadius: 12,
    paddingVertical: 11, alignItems: "center",
    borderWidth: 1, borderColor: Colors.game.gold,
  },
  listAhTxt: {
    fontSize: 11, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 1.5,
  },
  detailClose: {
    backgroundColor: Colors.game.surface, borderRadius: 12,
    paddingVertical: 12, alignItems: "center",
    borderWidth: 1, borderColor: Colors.game.border,
  },
  detailCloseTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 2 },
});
