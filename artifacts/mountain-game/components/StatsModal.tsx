import React, { useState, useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
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
  Leather: "🛡",
};

const TYPE_COLORS: Record<MaterialType, string> = {
  Ore: "#A0A0A0",
  Wood: "#A07B3C",
  Herb: "#22C55E",
  Leather: "#CD853F",
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
  const { removeMaterial } = useGame();
  const { buyOrders, yourId, fillBuyOrder } = useMultiplayer();
  const rc = RARITY_COLORS[entry.material.rarity];
  const vInfo = VERSION_LABELS[entry.material.version] ?? VERSION_LABELS[0];

  const matchingOrders = buyOrders.filter(
    (o) =>
      o.material.type === entry.material.type &&
      o.material.rarity === entry.material.rarity &&
      (o.material.version === null || o.material.version === entry.material.version) &&
      o.buyerId !== yourId &&
      o.count - o.filled > 0
  );
  const bestOrder = [...matchingOrders].sort((a, b) => b.pricePerUnit - a.pricePerUnit)[0] ?? null;
  const fillCount = bestOrder ? Math.min(entry.count, bestOrder.count - bestOrder.filled) : 0;
  const quickSellGold = bestOrder ? fillCount * bestOrder.pricePerUnit : 0;

  const handleQuickSell = () => {
    if (!bestOrder || fillCount <= 0) return;
    removeMaterial(entry.key, fillCount);
    fillBuyOrder(bestOrder.id, fillCount, entry.material.version);
    onClose();
  };

  return (
    <Modal transparent visible animationType="fade">
      <Pressable style={styles.detailOverlay} onPress={onClose}>
        <Pressable style={[styles.detailCard, { borderColor: rc }]} onPress={(e) => e.stopPropagation()}>
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

          {/* Quick Sell if buy orders exist */}
          {bestOrder && (
            <Pressable style={styles.quickSellBtn} onPress={handleQuickSell}>
              <Text style={styles.quickSellTxt}>
                ⚡ QUICK SELL ×{fillCount}  ·  {quickSellGold.toLocaleString()}G
              </Text>
              <Text style={styles.quickSellSub}>Best buy order — {bestOrder.pricePerUnit}G each · by {bestOrder.buyerName}</Text>
            </Pressable>
          )}

          {/* List on AH */}
          {onListOnAh && (
            <Pressable style={styles.listAhBtn} onPress={() => onListOnAh(entry)}>
              <Text style={styles.listAhTxt}>LIST ON AUCTION HOUSE</Text>
            </Pressable>
          )}

          <Pressable style={styles.detailClose} onPress={onClose}>
            <Text style={styles.detailCloseTxt}>CLOSE</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function StatsModal({ visible, onClose, onListOnAh, onListItemOnAh, onListChestOnAh, onListPotionOnAh, onListToolOnAh }: StatsModalProps) {
  const { gameState, allocateStat, addItemToBag, addPotionToBag, removeChestFromBag, equipItem, removeItemFromBag, consumePotion, removePotionFromBag, addToolToBag } = useGame();
  const char = gameState.character;
  const hasPending = char.pendingStatPoints > 0;
  const xpPct = Math.min(100, (char.xp / char.xpToNext) * 100);
  const [selectedEntry, setSelectedEntry] = useState<MaterialEntry | null>(null);
  const [selectedChest, setSelectedChest] = useState<ItemChest | null>(null);
  const [selectedBagItem, setSelectedBagItem] = useState<GameItem | null>(null);
  const [selectedPotion, setSelectedPotion] = useState<Potion | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "inventory" | "equipment" | "tools">("profile");
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set(["Weapon", "Armor", "Boots", "Helmet", "Amulet", "Ring"]));

  const toggleSlot = (slot: string) => {
    setExpandedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  };

  // Group inventory by material type, sort each group by rarity (highest first)
  const groupedInventory = useMemo(() => {
    const groups: Record<MaterialType, MaterialEntry[]> = {
      Ore: [], Wood: [], Herb: [], Leather: [],
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
    const stacks = new Map<string, { rep: typeof char.potionBag[0]; count: number }>();
    for (const p of char.potionBag ?? []) {
      const key = `${p.type}|${p.rarity}|${p.tier}`;
      if (!stacks.has(key)) stacks.set(key, { rep: p, count: 0 });
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
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tabBtn, activeTab === "profile" && styles.tabBtnActive]}
              onPress={() => setActiveTab("profile")}
            >
              <Text style={[styles.tabText, activeTab === "profile" && styles.tabTextActive]}>
                PROFILE
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, activeTab === "inventory" && styles.tabBtnActive]}
              onPress={() => setActiveTab("inventory")}
            >
              <Text style={[styles.tabText, activeTab === "inventory" && styles.tabTextActive]}>
                ITEMS {totalItems > 0 ? `(${totalItems})` : ""}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, activeTab === "equipment" && styles.tabBtnActive]}
              onPress={() => setActiveTab("equipment")}
            >
              <Text style={[styles.tabText, activeTab === "equipment" && styles.tabTextActive]}>
                GEAR {Object.keys(char.equippedItems).length > 0 ? `(${Object.keys(char.equippedItems).length})` : ""}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, activeTab === "tools" && styles.tabBtnActive]}
              onPress={() => setActiveTab("tools")}
            >
              <Text style={[styles.tabText, activeTab === "tools" && styles.tabTextActive]}>
                TOOLS {((char.toolBag?.length ?? 0) + Object.keys(char.equippedTools ?? {}).length) > 0 ? `(${(char.toolBag?.length ?? 0) + Object.keys(char.equippedTools ?? {}).length})` : ""}
              </Text>
            </Pressable>
          </View>

          {/* ── Profile tab ───────────────────────────────────────────── */}
          {activeTab === "profile" && (
            <View style={styles.tabContent}>
              <View style={styles.header}>
                <View>
                  <Text style={styles.nameLabel}>WANDERER</Text>
                  <View style={styles.levelRow}>
                    <Text style={styles.lvLabel}>Level </Text>
                    <Text style={styles.lvValue}>{char.level}</Text>
                  </View>
                </View>
                <View style={styles.goldBlock}>
                  <View style={styles.goldCoin}>
                    <Text style={styles.goldCoinText}>G</Text>
                  </View>
                  <Text style={styles.goldVal}>{char.gold.toLocaleString()}</Text>
                </View>
              </View>

              <View style={styles.xpRow}>
                <View style={styles.xpGem}>
                  <Text style={styles.xpGemText}>✦</Text>
                </View>
                <View style={styles.xpTrack}>
                  <View style={[styles.xpFill, { width: `${xpPct}%` as any }]} />
                </View>
                <Text style={styles.xpNums}>{char.xp}/{char.xpToNext}</Text>
              </View>

              {hasPending && (
                <View style={styles.pendingBanner}>
                  <Text style={styles.pendingText}>
                    ✦ {char.pendingStatPoints} stat point{char.pendingStatPoints > 1 ? "s" : ""} to allocate
                  </Text>
                </View>
              )}

              <View style={styles.divider} />

              {/* Active buffs */}
              {char.activeBuffs.length > 0 && (
                <View style={{ marginBottom: 10, gap: 6 }}>
                  {char.activeBuffs.map((buff) => {
                    const now = Date.now();
                    const remaining = Math.max(0, Math.ceil((buff.expiresAt - now) / 1000));
                    const label = buff.type === "Gold" ? "🟡 Gold Boost" : buff.type === "XP" ? "✨ XP Boost" : "⚡ Speed Boost";
                    const color = buff.type === "Gold" ? Colors.game.gold : buff.type === "XP" ? Colors.game.purpleLight : Colors.game.blue;
                    return (
                      <View key={buff.type} style={[styles.buffBadge, { borderColor: color }]}>
                        <Text style={[styles.buffText, { color }]}>{label} · {Math.round((buff.multiplier - 1) * 100)}% · {remaining}s left</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.statGrid}>
                  {STAT_CONFIG.map((s) => {
                    const val = char.stats[s.key];
                    let derivedLabel: string | null = null;
                    if (s.key === "defence") derivedLabel = "increases block chance";
                    else if (s.key === "speed") derivedLabel = "increases turn frequency";
                    else if (s.key === "strength") derivedLabel = `${Math.round(val * 0.9)}–${Math.round(val * 1.1)} dmg`;
                    else if (s.key === "health") derivedLabel = `${Math.floor(val * 10)} max HP`;
                    return (
                      <View key={s.key} style={styles.statCard}>
                        <View style={styles.statCardTop}>
                          <Text style={styles.statIcon}>{s.icon}</Text>
                          <View style={styles.statInfo}>
                            <Text style={[styles.statName, { color: s.color }]}>{s.label}</Text>
                            <Text style={styles.statDesc}>{s.desc}</Text>
                            {derivedLabel && (
                              <Text style={[styles.statDerived, { color: s.color }]}>{derivedLabel}</Text>
                            )}
                          </View>
                          <Text style={[styles.statVal, { color: s.color }]}>
                            {s.key === "strength" ? val.toFixed(2) : Math.floor(val)}
                          </Text>
                        </View>
                        {hasPending && (
                          <Pressable
                            style={[styles.allocBtn, { borderColor: s.color }]}
                            onPress={() => allocateStat(s.key)}
                          >
                            <Text style={[styles.allocBtnText, { color: s.color }]}>
                              + Allocate ({s.bonus})
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
                <View style={{ height: 24 }} />
              </ScrollView>
            </View>
          )}

          {/* ── Equipment tab ───────────────────────────────────────────── */}
          {activeTab === "equipment" && (
            <View style={styles.tabContent}>
              <EquipmentTab />
            </View>
          )}

          {/* ── Inventory tab ───────────────────────────────────────────── */}
          {activeTab === "inventory" && (
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
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
                        <View style={[styles.typeHeader, { borderColor: typeColor }]}>
                          <Text style={[styles.typeHeaderIcon, { color: typeColor }]}>{TYPE_ICONS[type]}</Text>
                          <Text style={[styles.typeHeaderName, { color: typeColor }]}>{type.toUpperCase()}</Text>
                          <View style={[styles.typeHeaderBadge, { backgroundColor: typeColor }]}>
                            <Text style={styles.typeHeaderBadgeText}>×{entries.reduce((s, e) => s + e.count, 0)}</Text>
                          </View>
                        </View>
                        <View style={styles.inventoryGrid}>
                          {entries.map((entry) => {
                            const rc = RARITY_COLORS[entry.material.rarity];
                            return (
                              <Pressable key={entry.key} style={styles.invSlotWrap} onPress={() => setSelectedEntry(entry)}>
                                <View style={[styles.invSlot, { borderColor: rc }]}>
                                  <MaterialImage type={entry.material.type} rarity={entry.material.rarity} version={entry.material.version} size={68} compact animateParticles={false} />
                                </View>
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
                        </View>
                      </View>
                    );
                  })}

                  {/* ── Chests ── */}
                  {chestStacks.length > 0 && (
                    <View style={styles.typeSection}>
                      <View style={[styles.typeHeader, { borderColor: Colors.game.gold }]}>
                        <Text style={[styles.typeHeaderIcon, { color: Colors.game.gold }]}>📦</Text>
                        <Text style={[styles.typeHeaderName, { color: Colors.game.gold }]}>CHESTS</Text>
                        <View style={[styles.typeHeaderBadge, { backgroundColor: Colors.game.gold }]}>
                          <Text style={styles.typeHeaderBadgeText}>×{chestStacks.reduce((s, { count }) => s + count, 0)}</Text>
                        </View>
                      </View>
                      <View style={styles.inventoryGrid}>
                        {chestStacks.map(({ rep, count }) => {
                          const rc = ITEM_RARITY_COLORS[rep.rarity];
                          return (
                            <Pressable key={`${rep.rarity}-${rep.tier}`} style={styles.invSlotWrap} onPress={() => setSelectedChest(rep)}>
                              <View style={[styles.invSlot, { borderColor: rc }]}>
                                <ChestImage rarity={rep.rarity} size={68} compact />
                              </View>
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
                      </View>
                    </View>
                  )}

                  {/* ── Potions ── */}
                  {potionStacks.length > 0 && (
                    <View style={styles.typeSection}>
                      <View style={[styles.typeHeader, { borderColor: Colors.game.purpleLight }]}>
                        <Text style={[styles.typeHeaderIcon, { color: Colors.game.purpleLight }]}>⚗</Text>
                        <Text style={[styles.typeHeaderName, { color: Colors.game.purpleLight }]}>POTIONS</Text>
                        <View style={[styles.typeHeaderBadge, { backgroundColor: Colors.game.purpleLight }]}>
                          <Text style={styles.typeHeaderBadgeText}>×{char.potionBag.length}</Text>
                        </View>
                      </View>
                      <View style={styles.inventoryGrid}>
                        {potionStacks.map(({ rep, count }) => {
                          const rc = ITEM_RARITY_COLORS[rep.rarity];
                          return (
                            <Pressable key={`${rep.type}|${rep.rarity}|${rep.tier}`} style={styles.invSlotWrap} onPress={() => setSelectedPotion(rep)}>
                              <View style={[styles.invSlot, { borderColor: rc }]}>
                                <PotionImage type={rep.type} rarity={rep.rarity} tier={rep.tier} size={68} compact />
                              </View>
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
                                <Text style={styles.equipSlotChevron}>{isOpen ? "▼" : "▶"}</Text>
                              </Pressable>
                              {isOpen && (
                                <View style={styles.inventoryGrid}>
                                  {items.map((item) => {
                                    const rc = ITEM_RARITY_COLORS[item.rarity];
                                    const qc = ITEM_QUALITY_COLORS[item.quality];
                                    return (
                                      <Pressable key={item.id} style={styles.invSlotWrap} onPress={() => setSelectedBagItem(item)}>
                                        <View style={[styles.invSlot, { borderColor: rc }]}>
                                          <ItemImage slot={item.slot} rarity={item.rarity} quality={item.quality} tier={item.tier} size={68} compact />
                                        </View>
                                        <View style={[styles.countBadge, { backgroundColor: rc }]}>
                                          <Text style={styles.countText} numberOfLines={1}>{item.rarity} · {item.quality}</Text>
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
          )}

          {/* ── Tools tab ─────────────────────────────────────────────── */}
          {activeTab === "tools" && (
            <View style={styles.tabContent}>
              <ToolsTab onListOnAh={onListToolOnAh} />
            </View>
          )}

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>CLOSE</Text>
          </Pressable>
        </View>
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
            if ("sweepChance" in drop) {
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
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.game.surfaceAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.game.border,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: Colors.game.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },

  // Tabs
  tabBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    backgroundColor: Colors.game.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: Colors.game.gold,
  },
  tabText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 1,
  },
  tabTextActive: {
    color: "#3d2e00",
  },
  tabContent: {
    flex: 1,
    minHeight: 300,
  },

  // Profile
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
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
    flex: 1, height: 5,
    backgroundColor: Colors.game.border, borderRadius: 3, overflow: "hidden",
  },
  xpFill: { height: "100%", backgroundColor: Colors.game.purple, borderRadius: 3 },
  xpNums: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.game.textMuted },
  pendingBanner: {
    backgroundColor: "rgba(128,96,192,0.15)",
    borderRadius: 10, padding: 10,
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
    borderWidth: 1, borderColor: Colors.game.border, gap: 8,
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
  typeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
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
  invSlot: {
    width: 72, height: 72, borderRadius: 12,
    borderWidth: 2, overflow: "visible",
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.game.surface,
  },
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
    backgroundColor: Colors.game.surface,
    borderRadius: 14, paddingVertical: 14,
    alignItems: "center", marginTop: 10,
    borderWidth: 1, borderColor: Colors.game.border,
  },
  closeBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 2 },

  // Item detail
  detailOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center",
    padding: 24,
  },
  detailCard: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 20, padding: 20,
    width: "100%", maxWidth: 340,
    borderWidth: 2, gap: 10,
  },
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
    color: Colors.game.green, letterSpacing: 1,
  },
  quickSellSub: {
    fontSize: 10, fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted,
  },
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
