import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import {
  AuctionListing,
  BuyOrder,
  useMultiplayer,
} from "@/context/MultiplayerContext";
import {
  ItemChest as GameItemChest,
  Material,
  MaterialEntry,
  MaterialType,
  RARITIES,
  RARITY_COLORS,
  RarityName,
  VersionNum,
  useGame,
} from "@/context/GameContext";
import {
  formatChestName,
  GameItem,
  ITEM_RARITY_COLORS,
  ITEM_SLOTS,
  ITEM_SLOT_ICONS,
  ITEM_QUALITY_COLORS,
  ItemChest,
  ItemRarity,
  ItemQuality,
  ItemSlot,
  ITEM_RARITIES,
} from "@/lib/items";
import { ChestImage } from "./ChestImage";
import { ItemImage } from "./ItemImage";
import { MaterialImage } from "./MaterialImage";
import { PotionImage } from "./PotionImage";
import { RarityText } from "./RarityText";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "listings" | "orders";
type Step = "tabs" | "pick" | "price" | "item-price" | "chest-price" | "potion-price" | "bo-create";
type FilterType = "All" | MaterialType | "Equipment" | "Chest" | "Potion";
type SortKey = "price" | "qty" | "time";
type SortDir = "asc" | "desc";

const FILTER_TYPES: FilterType[] = ["All", "Equipment", "Chest", "Potion", "Ore", "Wood", "Herb", "Leather"];
const MATERIAL_TYPES: MaterialType[] = ["Ore", "Wood", "Herb", "Leather"];
const BO_TYPES: string[] = ["Ore", "Wood", "Herb", "Leather", "Equipment", "Chest", "Potion"];
const BO_QUALITIES: ItemQuality[] = ["Basic", "Good", "Excellent"];
const BO_STAT_PREFS: { key: "strength" | "health" | "defence" | "speed"; label: string; icon: string }[] = [
  { key: "strength", label: "Strength", icon: "⚔" },
  { key: "health", label: "Health", icon: "♥" },
  { key: "defence", label: "Defence", icon: "🛡" },
  { key: "speed", label: "Speed", icon: "⚡" },
];
function isMaterialType(t: string): t is MaterialType { return MATERIAL_TYPES.includes(t as MaterialType); }
const SORT_LABELS: Record<SortKey, string> = { price: "PRICE", qty: "QTY", time: "TIME" };

// ─── Sell listing card ────────────────────────────────────────────────────────

function ListingCard({
  listing, isOwn, canAfford, onBuy, onCancel,
}: {
  listing: AuctionListing; isOwn: boolean; canAfford: boolean;
  onBuy: () => void; onCancel: () => void;
}) {
  const rarityColor = RARITY_COLORS[listing.material.rarity as RarityName] ?? "#9CA3AF";
  return (
    <View style={[styles.listingCard, isOwn && styles.ownCard, { borderColor: rarityColor + "55" }]}>
      <View style={styles.listingImg}>
        <MaterialImage
          type={listing.material.type as MaterialType}
          rarity={listing.material.rarity as RarityName}
          version={listing.material.version as VersionNum}
          size={54} compact animateParticles={false}
        />
      </View>
      <View style={styles.listingInfo}>
        <RarityText
          rarity={listing.material.rarity as RarityName}
          version={listing.material.version as VersionNum}
          label={`${listing.material.rarity} ${listing.material.type}`}
          style={styles.listingName}
        />
        <Text style={styles.listingMeta}>
          ×{listing.count}  ·  {isOwn ? "YOUR LISTING" : listing.sellerName}
        </Text>
      </View>
      <View style={styles.listingRight}>
        <View style={styles.priceRow}>
          <View style={styles.goldCoin}><Text style={styles.goldCoinTxt}>G</Text></View>
          <Text style={styles.priceText}>{listing.price.toLocaleString()}</Text>
        </View>
        {isOwn ? (
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnTxt}>CANCEL</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
            onPress={onBuy} disabled={!canAfford}
          >
            <Text style={[styles.buyBtnTxt, !canAfford && styles.buyBtnTxtDim]}>BUY</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Buy order card ───────────────────────────────────────────────────────────

function BuyOrderCard({
  order, isOwn, matchEntry, matchItem, matchChest, matchPotion, onFill, onCancel,
}: {
  order: BuyOrder; isOwn: boolean; matchEntry?: MaterialEntry; matchItem?: GameItem; matchChest?: ItemChest; matchPotion?: { rarity: string; tier: number; type: string; id: string; };
  onFill: (qty: number) => void; onCancel: () => void;
}) {
  const remaining = order.count - order.filled;
  const isEquip = order.material.type === "Equipment";
  const isChest = order.material.type === "Chest";
  const isPotion = order.material.type === "Potion";
  const hasMatch = isEquip ? !!matchItem : isChest ? !!matchChest : isPotion ? !!matchPotion : !!matchEntry;
  const maxFill = isEquip || isChest || isPotion ? (hasMatch ? 1 : 0) : (matchEntry ? Math.min(matchEntry.count, remaining) : 0);
  const rarityColor = RARITY_COLORS[order.material.rarity as RarityName] ?? "#9CA3AF";
  const displayVersion = (order.material.version ?? 0) as VersionNum;

  const [qty, setQty] = useState(maxFill);
  useEffect(() => { setQty(maxFill); }, [maxFill]);

  let label = `${order.material.rarity} ${order.material.type}`;
  let meta = `${order.material.version === null ? "Any tier" : `T${order.material.version}`}  ·  ${isOwn ? "YOUR ORDER" : order.buyerName}`;
  if (isEquip && order.material.slot) {
    label = `${order.material.rarity} ${order.material.slot}`;
    meta = `${order.material.quality ?? "Any quality"}  ·  ${order.material.statPref ? `Highest ${order.material.statPref}` : "Any stat"}  ·  ${isOwn ? "YOUR ORDER" : order.buyerName}`;
  }
  if (isChest) {
    meta = `${order.material.version === null ? "Any tier" : `T${order.material.version}`}  ·  ${isOwn ? "YOUR ORDER" : order.buyerName}`;
  }
  if (isPotion) {
    label = `${order.material.rarity} Potion`;
  }

  return (
    <View style={[styles.listingCard, isOwn && styles.ownCard, { borderColor: rarityColor + "55" }]}>
      <View style={styles.listingImg}>
        {isEquip && matchItem ? (
          <ItemImage slot={matchItem.slot} rarity={matchItem.rarity} quality={matchItem.quality} tier={matchItem.tier} size={54} />
        ) : isEquip ? (
          <View style={[styles.equipPlaceholder, { borderColor: rarityColor }]}>
            <Text style={[styles.equipPlaceholderText, { color: rarityColor }]}>{ITEM_SLOT_ICONS[order.material.slot as ItemSlot] ?? "⚔"}</Text>
          </View>
        ) : isChest && matchChest ? (
          <ChestImage rarity={matchChest.rarity} size={54} />
        ) : isChest ? (
          <View style={[styles.equipPlaceholder, { borderColor: rarityColor }]}>
            <Text style={[styles.equipPlaceholderText, { color: rarityColor }]}>📦</Text>
          </View>
        ) : isPotion && matchPotion ? (
          <PotionImage type={matchPotion.type as any} rarity={matchPotion.rarity as any} tier={matchPotion.tier as any} size={54} compact />
        ) : isPotion ? (
          <View style={[styles.equipPlaceholder, { borderColor: rarityColor }]}>
            <Text style={[styles.equipPlaceholderText, { color: rarityColor }]}>🧪</Text>
          </View>
        ) : (
          <MaterialImage
            type={order.material.type as MaterialType}
            rarity={order.material.rarity as RarityName}
            version={displayVersion}
            size={54} compact animateParticles={false}
          />
        )}
      </View>
      <View style={styles.listingInfo}>
        <RarityText
          rarity={order.material.rarity as RarityName}
          version={displayVersion}
          label={label}
          style={styles.listingName}
        />
        <Text style={styles.listingMeta}>{meta}</Text>
        <Text style={styles.boRemaining}>×{remaining} still needed</Text>
      </View>
      <View style={styles.listingRight}>
        <View style={styles.priceRow}>
          <View style={styles.goldCoin}><Text style={styles.goldCoinTxt}>G</Text></View>
          <Text style={styles.priceText}>{order.pricePerUnit.toLocaleString()}</Text>
          <Text style={styles.perEach}>/ea</Text>
        </View>
        {isOwn ? (
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnTxt}>CANCEL</Text>
          </Pressable>
        ) : maxFill > 0 ? (
          <View style={styles.fillCol}>
            {maxFill > 1 && (
              <View style={styles.stepperRow}>
                <Pressable style={styles.stepBtn} onPress={() => setQty((q) => Math.max(1, q - 1))} hitSlop={6}>
                  <Text style={styles.stepBtnTxt}>−</Text>
                </Pressable>
                <Text style={styles.stepQty}>×{qty}</Text>
                <Pressable style={styles.stepBtn} onPress={() => setQty((q) => Math.min(maxFill, q + 1))} hitSlop={6}>
                  <Text style={styles.stepBtnTxt}>+</Text>
                </Pressable>
              </View>
            )}
            <Pressable style={styles.fillBtn} onPress={() => onFill(qty)}>
              <Text style={styles.fillBtnTxt}>SELL</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.noItemTag}>
            <Text style={styles.noItemTagTxt}>NO ITEM</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Chest listing card ───────────────────────────────────────────────────────

function ChestListingCard({
  listing, isOwn, canAfford, onBuy, onCancel,
}: {
  listing: AuctionListing; isOwn: boolean; canAfford: boolean;
  onBuy: () => void; onCancel: () => void;
}) {
  const chest = listing.item as { rarity?: string; tier?: number } | undefined;
  const rc = (ITEM_RARITY_COLORS as Record<string, string>)[listing.material.rarity] ?? "#F59E0B";
  return (
    <View style={[styles.listingCard, isOwn && styles.ownCard, { borderColor: rc + "55" }]}>
      <View style={styles.listingImg}>
        <ChestImage rarity={listing.material.rarity as ItemRarity} size={54} compact />
      </View>
      <View style={styles.listingInfo}>
        <Text style={[styles.listingName, { color: rc }]} numberOfLines={1}>
          {`T${chest?.tier ?? listing.material.version ?? 0} ${listing.material.rarity} Chest`}
        </Text>
        <Text style={styles.listingMeta}>
          {isOwn ? "YOUR LISTING" : listing.sellerName}
        </Text>
      </View>
      <View style={styles.listingRight}>
        <View style={styles.priceRow}>
          <View style={styles.goldCoin}><Text style={styles.goldCoinTxt}>G</Text></View>
          <Text style={styles.priceText}>{listing.price.toLocaleString()}</Text>
        </View>
        {isOwn ? (
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnTxt}>CANCEL</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
            onPress={onBuy} disabled={!canAfford}
          >
            <Text style={[styles.buyBtnTxt, !canAfford && styles.buyBtnTxtDim]}>BUY</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Potion listing card ────────────────────────────────────────────────────

function PotionListingCard({
  listing, isOwn, canAfford, onBuy, onCancel,
}: {
  listing: AuctionListing; isOwn: boolean; canAfford: boolean;
  onBuy: () => void; onCancel: () => void;
}) {
  const rc = (ITEM_RARITY_COLORS as Record<string, string>)[listing.material.rarity] ?? "#A855F7";
  const potion = (listing.item ?? {}) as any;
  const type = potion.type as "Gold" | "XP" | "Exploration" | undefined;
  const tier = potion.tier ?? 0;
  return (
    <View style={[styles.listingCard, isOwn && styles.ownCard, { borderColor: rc + "55" }]}>
      <View style={styles.listingImg}>
        <PotionImage type={type ?? "Gold"} rarity={listing.material.rarity as any} tier={tier} size={54} compact />
      </View>
      <View style={styles.listingInfo}>
        <Text style={[styles.listingName, { color: rc }]} numberOfLines={1}>
          {`${listing.material.rarity} ${type ?? "Potion"}`}
        </Text>
        <Text style={styles.listingMeta}>
          {isOwn ? "YOUR LISTING" : listing.sellerName}
        </Text>
      </View>
      <View style={styles.listingRight}>
        <View style={styles.priceRow}>
          <View style={styles.goldCoin}><Text style={styles.goldCoinTxt}>G</Text></View>
          <Text style={styles.priceText}>{listing.price.toLocaleString()}</Text>
        </View>
        {isOwn ? (
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnTxt}>CANCEL</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
            onPress={onBuy} disabled={!canAfford}
          >
            <Text style={[styles.buyBtnTxt, !canAfford && styles.buyBtnTxtDim]}>BUY</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Equipment listing card ───────────────────────────────────────────────────

function ItemListingCard({
  listing, isOwn, canAfford, onBuy, onCancel,
}: {
  listing: AuctionListing; isOwn: boolean; canAfford: boolean;
  onBuy: () => void; onCancel: () => void;
}) {
  const item = listing.item as GameItem | undefined;
  const rc = (ITEM_RARITY_COLORS as Record<string, string>)[listing.material.rarity] ?? "#9CA3AF";
  return (
    <View style={[styles.listingCard, isOwn && styles.ownCard, { borderColor: rc + "55" }]}>
      <View style={styles.listingImg}>
        {item ? (
          <ItemImage slot={item.slot} rarity={item.rarity} quality={item.quality} size={54} compact />
        ) : (
          <View style={{ width: 54, height: 54, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 28 }}>⚔</Text>
          </View>
        )}
      </View>
      <View style={styles.listingInfo}>
        <Text style={[styles.listingName, { color: rc }]} numberOfLines={1}>
          {item?.name ?? `${listing.material.rarity} Equipment`}
        </Text>
        <Text style={styles.listingMeta}>
          {item?.slot ?? "Equipment"} · T{listing.material.version} · {isOwn ? "YOUR LISTING" : listing.sellerName}
        </Text>
      </View>
      <View style={styles.listingRight}>
        <View style={styles.priceRow}>
          <View style={styles.goldCoin}><Text style={styles.goldCoinTxt}>G</Text></View>
          <Text style={styles.priceText}>{listing.price.toLocaleString()}</Text>
        </View>
        {isOwn ? (
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnTxt}>CANCEL</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
            onPress={onBuy} disabled={!canAfford}
          >
            <Text style={[styles.buyBtnTxt, !canAfford && styles.buyBtnTxtDim]}>BUY</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface AuctionHouseModalProps {
  visible: boolean;
  onClose: () => void;
  preSelectedEntry?: MaterialEntry | null;
  preSelectedItem?: GameItem | null;
  preSelectedChest?: GameItemChest | null;
  preSelectedPotion?: any | null;
}

export function AuctionHouseModal({ visible, onClose, preSelectedEntry, preSelectedItem, preSelectedChest, preSelectedPotion }: AuctionHouseModalProps) {
  const { gameState, applyGoldXp, removeMaterial, removeItemFromBag, removeChestFromBag, removePotionFromBag } = useGame();
  const {
    yourId,
    listings,
    listAhItem, listAhEquipItem, listAhChestItem, listAhPotion, buyAhItem, cancelAhListing, refreshListings,
    buyOrders,
    createBuyOrder, cancelBuyOrder, fillBuyOrder,
  } = useMultiplayer();
  const char = gameState.character;

  const [tab, setTab] = useState<Tab>("listings");
  const [step, setStep] = useState<Step>("tabs");
  const [pickedEntry, setPickedEntry] = useState<MaterialEntry | null>(null);
  const [pickedItem, setPickedItem] = useState<GameItem | null>(null);
  const [pickedChest, setPickedChest] = useState<GameItemChest | null>(null);
  const [pickedPotion, setPickedPotion] = useState<any>(null);
  const [countStr, setCountStr] = useState("1");
  const [priceStr, setPriceStr] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("All");
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  // Sort state
  const [sortBy, setSortBy] = useState<SortKey>("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Inventory strip toggle
  const [showInventoryTop, setShowInventoryTop] = useState(false);

  // Section expand/collapse
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Buy order creation form state
  const [boCategory, setBoCategory] = useState<string | null>(null);
  const [boType, setBoType] = useState<MaterialType | null>(null);
  const [boRarity, setBoRarity] = useState<RarityName | null>(null);
  const [boVersion, setBoVersion] = useState<number | null>(null);
  const [boSlot, setBoSlot] = useState<ItemSlot | null>(null);
  const [boQuality, setBoQuality] = useState<ItemQuality | null>(null);
  const [boStatPref, setBoStatPref] = useState<"strength" | "health" | "defence" | "speed" | null>(null);
  const [boCountStr, setBoCountStr] = useState("1");
  const [boPriceStr, setBoPriceStr] = useState("");

  // Handle pre-selected entry/item/chest from inventory
  useEffect(() => {
    if (visible && preSelectedEntry) {
      setPickedEntry(preSelectedEntry);
      setCountStr("1");
      setPriceStr("");
      setStep("price");
      setTab("listings");
    } else if (visible && preSelectedItem) {
      setPickedItem(preSelectedItem);
      setPriceStr("");
      setStep("item-price");
      setTab("listings");
    } else if (visible && preSelectedChest) {
      setPickedChest(preSelectedChest);
      setPriceStr("");
      setStep("chest-price");
      setTab("listings");
    } else if (visible && preSelectedPotion) {
      setPickedPotion(preSelectedPotion);
      setPriceStr("");
      setStep("potion-price");
      setTab("listings");
    }
    if (!visible) {
      setStep("tabs");
      setPickedEntry(null);
      setPickedItem(null);
      setPickedChest(null);
      setPickedPotion(null);
    }
  }, [visible, preSelectedEntry, preSelectedItem, preSelectedChest, preSelectedPotion]);

  const showFeedback = useCallback((msg: string, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 2500);
  }, []);

  // ── Sort helpers ──────────────────────────────────────────────────────────

  const handleSortPress = useCallback((key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir(key === "time" ? "desc" : "asc");
    }
  }, [sortBy]);

  const applySortListings = useCallback((list: AuctionListing[]): AuctionListing[] => {
    return [...list].sort((a, b) => {
      const [av, bv] =
        sortBy === "price" ? [a.price, b.price]
        : sortBy === "qty" ? [a.count, b.count]
        : [a.listedAt ?? 0, b.listedAt ?? 0];
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [sortBy, sortDir]);

  const applySortOrders = useCallback((list: BuyOrder[]): BuyOrder[] => {
    return [...list].sort((a, b) => {
      const [av, bv] =
        sortBy === "price" ? [a.pricePerUnit, b.pricePerUnit]
        : sortBy === "qty" ? [a.count - a.filled, b.count - b.filled]
        : [a.createdAt ?? 0, b.createdAt ?? 0];
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [sortBy, sortDir]);

  const applyTypeFilter = useCallback((list: (AuctionListing | BuyOrder)[]) =>
    typeFilter === "All" ? list : list.filter((item) => item.material.type === typeFilter),
  [typeFilter]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleBuy = useCallback((listing: AuctionListing) => {
    if (char.gold < listing.price) { showFeedback("Not enough gold!", false); return; }
    applyGoldXp(-listing.price, 0);
    buyAhItem(listing.id);
    showFeedback("Purchase sent — items incoming!");
  }, [char.gold, buyAhItem, applyGoldXp, showFeedback]);

  const handleCancel = useCallback((listing: AuctionListing) => {
    cancelAhListing(listing.id);
    showFeedback("Cancellation sent…");
  }, [cancelAhListing, showFeedback]);

  const handlePickItem = (entry: MaterialEntry) => {
    setPickedEntry(entry);
    setCountStr("1");
    setPriceStr("");
    setStep("price");
  };

  const handleConfirmList = () => {
    if (!pickedEntry) return;
    const count = Math.max(1, Math.min(parseInt(countStr.replace(/[^0-9]/g, ""), 10) || 1, pickedEntry.count));
    const price = parseInt(priceStr.replace(/[^0-9]/g, ""), 10) || 0;
    if (price <= 0) { showFeedback("Enter a price above 0.", false); return; }
    removeMaterial(pickedEntry.key, count);
    listAhItem(pickedEntry.material, count, price);
    setStep("tabs");
    setTab("listings");
    setPickedEntry(null);
    showFeedback("Item listed successfully!");
  };

  const handleConfirmListItem = () => {
    if (!pickedItem) return;
    const price = parseInt(priceStr.replace(/[^0-9]/g, ""), 10) || 0;
    if (price <= 0) { showFeedback("Enter a price above 0.", false); return; }
    removeItemFromBag(pickedItem.id);
    listAhEquipItem(pickedItem, price);
    setStep("tabs");
    setTab("listings");
    setPickedItem(null);
    setPriceStr("");
    showFeedback("Equipment listed for sale!");
  };

  const handleConfirmListChest = () => {
    if (!pickedChest) return;
    const price = parseInt(priceStr.replace(/[^0-9]/g, ""), 10) || 0;
    if (price <= 0) { showFeedback("Enter a price above 0.", false); return; }
    removeChestFromBag(pickedChest.id);
    listAhChestItem(pickedChest, price);
    setStep("tabs");
    setTab("listings");
    setPickedChest(null);
    setPriceStr("");
    showFeedback("Chest listed for sale!");
  };

  const handleConfirmListPotion = () => {
    if (!pickedPotion) return;
    const price = parseInt(priceStr.replace(/[^0-9]/g, ""), 10) || 0;
    if (price <= 0) { showFeedback("Enter a price above 0.", false); return; }
    removePotionFromBag(pickedPotion.id);
    listAhPotion(pickedPotion, price);
    setStep("tabs");
    setTab("listings");
    setPickedPotion(null);
    setPriceStr("");
    showFeedback("Potion listed for sale!");
  };

  const handleFillOrder = useCallback((order: BuyOrder, qty: number, itemId?: string, chestId?: string, potionId?: string) => {
    const mType = order.material.type;
    const remaining = order.count - order.filled;
    if (mType === "Equipment") {
      if (!itemId) { showFeedback("Select an item to sell.", false); return; }
      const item = char.itemBag.find((i) => i.id === itemId);
      if (!item) { showFeedback("Item not found.", false); return; }
      if (order.material.slot && item.slot !== order.material.slot) { showFeedback("Slot mismatch.", false); return; }
      if (order.material.rarity !== item.rarity) { showFeedback("Rarity mismatch.", false); return; }
      if (order.material.quality && item.quality !== order.material.quality) { showFeedback("Quality mismatch.", false); return; }
      if (order.material.statPref) {
        const stats = { strength: item.stats.strength, health: item.stats.health, defence: item.stats.defence, speed: item.stats.speed };
        const highest = Math.max(...Object.values(stats));
        const key = order.material.statPref as keyof typeof stats;
        if (stats[key] !== highest) { showFeedback("Stat preference mismatch.", false); return; }
      }
      const goldEarned = order.pricePerUnit;
      removeItemFromBag(itemId);
      fillBuyOrder(order.id, 1, 0, itemId);
      showFeedback(`Sold ${item.name} — ${goldEarned.toLocaleString()}G incoming!`);
      return;
    }
    if (mType === "Chest") {
      if (!chestId) { showFeedback("Select a chest to sell.", false); return; }
      const chest = char.chestBag.find((c) => c.id === chestId);
      if (!chest) { showFeedback("Chest not found.", false); return; }
      if (order.material.rarity !== chest.rarity) { showFeedback("Rarity mismatch.", false); return; }
      if (order.material.version !== null && order.material.version !== undefined && order.material.version !== chest.tier) { showFeedback("Tier mismatch.", false); return; }
      const goldEarned = order.pricePerUnit;
      removeChestFromBag(chestId);
      fillBuyOrder(order.id, 1, chest.tier, undefined, chestId);
      showFeedback(`Sold chest — ${goldEarned.toLocaleString()}G incoming!`);
      return;
    }
    if (mType === "Potion") {
      if (!potionId) { showFeedback("Select a potion to sell.", false); return; }
      const potion = char.potionBag.find((p) => p.id === potionId);
      if (!potion) { showFeedback("Potion not found.", false); return; }
      if (order.material.rarity !== potion.rarity) { showFeedback("Rarity mismatch.", false); return; }
      if (order.material.version !== null && order.material.version !== undefined && order.material.version !== potion.tier) { showFeedback("Tier mismatch.", false); return; }
      const goldEarned = order.pricePerUnit;
      removePotionFromBag(potionId);
      fillBuyOrder(order.id, 1, potion.tier, undefined, undefined, potionId);
      showFeedback(`Sold ${potion.type} Potion — ${goldEarned.toLocaleString()}G incoming!`);
      return;
    }
    const matchEntry = char.materials.find((e) =>
      e.material.type === order.material.type &&
      e.material.rarity === order.material.rarity &&
      (order.material.version === null || e.material.version === order.material.version) &&
      e.count > 0
    );
    if (!matchEntry) { showFeedback("You don't have this item.", false); return; }
    const fillCount = Math.min(qty, matchEntry.count, remaining);
    if (fillCount <= 0) return;
    const goldEarned = fillCount * order.pricePerUnit;
    removeMaterial(matchEntry.key, fillCount);
    fillBuyOrder(order.id, fillCount, matchEntry.material.version);
    showFeedback(`Sold ×${fillCount} — ${goldEarned.toLocaleString()}G incoming!`);
  }, [char.materials, char.itemBag, char.chestBag, char.potionBag, removeMaterial, removeItemFromBag, removeChestFromBag, removePotionFromBag, fillBuyOrder, showFeedback]);

  const handleCancelOrder = useCallback((order: BuyOrder) => {
    cancelBuyOrder(order.id);
    showFeedback("Buy order cancelled…");
  }, [cancelBuyOrder, showFeedback]);

  // Quick sell: sell inventory item to the best (highest price) matching buy order
  const handleQuickSell = useCallback((entry: MaterialEntry) => {
    const activeOrders = buyOrders.filter((o) =>
      o.count - o.filled > 0 &&
      o.buyerId !== yourId &&
      o.material.type === entry.material.type &&
      o.material.rarity === entry.material.rarity &&
      (o.material.version === null || o.material.version === entry.material.version)
    );
    if (activeOrders.length === 0) { showFeedback("No buy orders for this item.", false); return; }
    const best = activeOrders.reduce((b, o) => o.pricePerUnit > b.pricePerUnit ? o : b);
    const remaining = best.count - best.filled;
    const fillCount = Math.min(entry.count, remaining);
    if (fillCount <= 0) return;
    const goldEarned = fillCount * best.pricePerUnit;
    removeMaterial(entry.key, fillCount);
    fillBuyOrder(best.id, fillCount, entry.material.version);
    showFeedback(`Quick sold ×${fillCount} → ${goldEarned.toLocaleString()}G!`);
  }, [buyOrders, yourId, removeMaterial, fillBuyOrder, showFeedback]);

  const handleConfirmBoCreate = () => {
    const isEquip = boCategory === "Equipment";
    const isChest = boCategory === "Chest";
    const isMaterial = boCategory && MATERIAL_TYPES.includes(boCategory as MaterialType);
    if (!boCategory || !boRarity) { showFeedback("Select type and rarity first.", false); return; }
    if (isEquip && !boSlot) { showFeedback("Select an equipment slot.", false); return; }
    const count = parseInt(boCountStr.replace(/[^0-9]/g, ""), 10) || 0;
    const pricePerUnit = parseInt(boPriceStr.replace(/[^0-9]/g, ""), 10) || 0;
    if (count <= 0) { showFeedback("Enter a valid quantity.", false); return; }
    if (pricePerUnit <= 0) { showFeedback("Enter a price above 0.", false); return; }
    const total = count * pricePerUnit;
    if (char.gold < total) { showFeedback(`Not enough gold (need ${total.toLocaleString()}G).`, false); return; }
    const material: BuyOrder["material"] = { type: boCategory, rarity: boRarity, version: boVersion };
    if (isEquip && boSlot) material.slot = boSlot;
    if (isEquip && boQuality) material.quality = boQuality;
    if (isEquip && boStatPref) material.statPref = boStatPref;
    applyGoldXp(-total, 0);
    createBuyOrder(material, count, pricePerUnit);
    setStep("tabs");
    setTab("orders");
    setBoCategory(null); setBoType(null); setBoRarity(null); setBoVersion(null);
    setBoSlot(null); setBoQuality(null); setBoStatPref(null);
    setBoCountStr("1"); setBoPriceStr("");
    showFeedback(`Buy order posted! ${total.toLocaleString()}G locked.`);
  };

  const handleRefresh = () => { refreshListings(); showFeedback("Refreshed."); };

  const handleClose = () => {
    setStep("tabs");
    setPickedEntry(null);
    setPickedItem(null);
    setPickedChest(null);
    setPriceStr("");
    setBoType(null); setBoRarity(null); setBoVersion(null);
    setBoCountStr("1"); setBoPriceStr("");
    onClose();
  };

  // ── Sort bar ──────────────────────────────────────────────────────────────

  const renderSortBar = () => (
    <View style={styles.sortBar}>
      <Text style={styles.sortLabel}>SORT:</Text>
      {(["price", "qty", "time"] as SortKey[]).map((key) => {
        const active = sortBy === key;
        const arrow = active ? (sortDir === "asc" ? " ↑" : " ↓") : "";
        return (
          <Pressable
            key={key}
            style={[styles.sortBtn, active && styles.sortBtnActive]}
            onPress={() => handleSortPress(key)}
          >
            <Text style={[styles.sortBtnTxt, active && styles.sortBtnTxtActive]}>
              {SORT_LABELS[key]}{arrow}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  // ── Category filter chips ─────────────────────────────────────────────────

  const renderFilters = () => (
    <ScrollView
      horizontal showsHorizontalScrollIndicator={false}
      style={styles.filterScroll} contentContainerStyle={styles.filterRow}
    >
      {FILTER_TYPES.map((ft) => (
        <Pressable
          key={ft}
          style={[styles.filterChip, typeFilter === ft && styles.filterChipActive]}
          onPress={() => setTypeFilter(ft)}
        >
          <Text style={[styles.filterChipTxt, typeFilter === ft && styles.filterChipTxtActive]}>
            {ft.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  // ── Sell listings tab (grouped by type + rarity) ─────────────────────────

  const renderListings = () => {
    const filtered = applyTypeFilter(listings) as AuctionListing[];
    const sorted = applySortListings(filtered);

    // Split by type
    const equipListings   = sorted.filter((l) => (l.material.type as string) === "Equipment");
    const chestListings   = sorted.filter((l) => (l.material.type as string) === "Chest");
    const potionListings  = sorted.filter((l) => (l.material.type as string) === "Potion");
    const matListings     = sorted.filter((l) =>
      (l.material.type as string) !== "Equipment" &&
      (l.material.type as string) !== "Chest" &&
      (l.material.type as string) !== "Potion"
    );

    // Group material listings: type -> rarity -> items
    const groups = new Map<string, Map<string, AuctionListing[]>>();
    matListings.forEach((l) => {
      const typeKey = l.material.type;
      const rarityKey = l.material.rarity;
      if (!groups.has(typeKey)) groups.set(typeKey, new Map());
      const rMap = groups.get(typeKey)!;
      if (!rMap.has(rarityKey)) rMap.set(rarityKey, []);
      rMap.get(rarityKey)!.push(l);
    });

    // Preferred type order, then alpha for the rest
    const typeOrder = ["Ore", "Wood", "Herb", "Leather"];
    const sortedTypes = Array.from(groups.keys()).sort(
      (a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b)
    );

    const renderSectionHeader = (type: MaterialType, rarity: RarityName, count: number) => {
      const key = `list-${type}-${rarity}`;
      const expanded = expandedSections.has(key);
      const rc = RARITY_COLORS[rarity] ?? "#9CA3AF";
      return (
        <Pressable
          key={key}
          style={[styles.sectionHeader, { borderLeftColor: rc }]}
          onPress={() => toggleSection(key)}
        >
          <View style={styles.sectionDot}>
            <View style={[styles.sectionDotInner, { backgroundColor: rc }]} />
          </View>
          <Text style={[styles.sectionTitle, { color: rc }]}>
            {rarity.toUpperCase()} {type.toUpperCase()}
          </Text>
          <Text style={styles.sectionCount}>({count})</Text>
          <Text style={styles.sectionArrow}>{expanded ? " ▼" : " ▶"}</Text>
        </Pressable>
      );
    };

    return (
      <View>
        <Pressable style={[styles.listItemBtn, { marginBottom: 8 }]} onPress={() => setStep("pick")}>
          <Text style={styles.listItemBtnTxt}>+ LIST MATERIAL</Text>
        </Pressable>

        {/* Equipment listings */}
        {equipListings.length > 0 && (typeFilter === "All" || typeFilter === "Equipment") && (
          <View style={{ marginBottom: 8 }}>
            <View style={[styles.sectionHeader, { borderLeftColor: Colors.game.purpleLight }]}>
              <View style={styles.sectionDot}>
                <View style={[styles.sectionDotInner, { backgroundColor: Colors.game.purpleLight }]} />
              </View>
              <Text style={[styles.sectionTitle, { color: Colors.game.purpleLight }]}>⚔ EQUIPMENT LISTINGS</Text>
              <Text style={styles.sectionCount}>({equipListings.length})</Text>
            </View>
            {equipListings.map((l) => (
              <ItemListingCard
                key={l.id}
                listing={l}
                isOwn={l.sellerId === yourId}
                canAfford={char.gold >= l.price}
                onBuy={() => handleBuy(l)}
                onCancel={() => handleCancel(l)}
              />
            ))}
          </View>
        )}

        {/* Chest listings */}
        {chestListings.length > 0 && (typeFilter === "All" || typeFilter === "Chest") && (
          <View style={{ marginBottom: 8 }}>
            <View style={[styles.sectionHeader, { borderLeftColor: Colors.game.gold }]}>
              <View style={styles.sectionDot}>
                <View style={[styles.sectionDotInner, { backgroundColor: Colors.game.gold }]} />
              </View>
              <Text style={[styles.sectionTitle, { color: Colors.game.gold }]}>📦 CHEST LISTINGS</Text>
              <Text style={styles.sectionCount}>({chestListings.length})</Text>
            </View>
            {chestListings.map((l) => (
              <ChestListingCard
                key={l.id}
                listing={l}
                isOwn={l.sellerId === yourId}
                canAfford={char.gold >= l.price}
                onBuy={() => handleBuy(l)}
                onCancel={() => handleCancel(l)}
              />
            ))}
          </View>
        )}

        {/* Potion listings */}
        {potionListings.length > 0 && (typeFilter === "All" || typeFilter === "Potion") && (
          <View style={{ marginBottom: 8 }}>
            <View style={[styles.sectionHeader, { borderLeftColor: Colors.game.purpleLight }]}>
              <View style={styles.sectionDot}>
                <View style={[styles.sectionDotInner, { backgroundColor: Colors.game.purpleLight }]} />
              </View>
              <Text style={[styles.sectionTitle, { color: Colors.game.purpleLight }]}>⚗ POTION LISTINGS</Text>
              <Text style={styles.sectionCount}>({potionListings.length})</Text>
            </View>
            {potionListings.map((l) => (
              <PotionListingCard
                key={l.id}
                listing={l}
                isOwn={l.sellerId === yourId}
                canAfford={char.gold >= l.price}
                onBuy={() => handleBuy(l)}
                onCancel={() => handleCancel(l)}
              />
            ))}
          </View>
        )}

        {renderSortBar()}
        {matListings.length === 0 && equipListings.length === 0 && chestListings.length === 0 && potionListings.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {listings.length === 0 ? "No listings yet." : "No listings match this filter."}
            </Text>
          </View>
        ) : matListings.length === 0 ? (
          <View style={{ height: 4 }} />
        ) : (
          <FlatList
            data={sortedTypes}
            keyExtractor={(t) => t}
            style={styles.listScroll}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: type }) => {
              const rMap = groups.get(type)!;
              // Rarity order = same as RARITIES array (Common..Mythic)
              const rarityEntries = RARITIES.filter((r) => rMap.has(r)).map((r) => ({
                rarity: r,
                items: rMap.get(r)!.sort((a, b) => (a.material.version ?? 0) - (b.material.version ?? 0)),
              }));
              return (
                <View style={{ marginBottom: 8 }}>
                  {rarityEntries.map(({ rarity, items }) => {
                    const key = `list-${type}-${rarity}`;
                    const expanded = expandedSections.has(key);
                    return (
                      <View key={key}>
                        {renderSectionHeader(type as MaterialType, rarity as RarityName, items.length)}
                        {expanded && (
                          <View style={styles.sectionBody}>
                            {items.map((l) => (
                              <ListingCard
                                key={l.id}
                                listing={l}
                                isOwn={l.sellerId === yourId}
                                canAfford={char.gold >= l.price}
                                onBuy={() => handleBuy(l)}
                                onCancel={() => handleCancel(l)}
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
            contentContainerStyle={{ paddingBottom: 4 }}
          />
        )}
      </View>
    );
  };

  // ── Buy orders tab (grouped by type + rarity) ──────────────────────────

  const renderOrders = () => {
    const active = buyOrders.filter((o) => o.count - o.filled > 0);
    const filtered = applyTypeFilter(active) as BuyOrder[];
    const sorted = applySortOrders(filtered);

    // Group: type -> rarity -> items
    const groups = new Map<string, Map<string, BuyOrder[]>>();
    sorted.forEach((o) => {
      const typeKey = o.material.type;
      const rarityKey = o.material.rarity;
      if (!groups.has(typeKey)) groups.set(typeKey, new Map());
      const rMap = groups.get(typeKey)!;
      if (!rMap.has(rarityKey)) rMap.set(rarityKey, []);
      rMap.get(rarityKey)!.push(o);
    });

    const typeOrder = ["Ore", "Wood", "Herb", "Leather", "Equipment", "Chest"];
    const sortedTypes = Array.from(groups.keys()).sort(
      (a, b) => {
        const ai = typeOrder.indexOf(a);
        const bi = typeOrder.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      }
    );

    // Inventory items that have matching open buy orders (not own)
    const matMatches = char.materials.filter((entry) =>
      entry.count > 0 &&
      active.some((o) =>
        o.buyerId !== yourId &&
        o.material.type === entry.material.type &&
        o.material.rarity === entry.material.rarity &&
        (o.material.version === null || o.material.version === entry.material.version)
      )
    );
    const equipMatches = char.itemBag.filter((item) =>
      active.some((o) =>
        o.buyerId !== yourId &&
        o.material.type === "Equipment" &&
        o.material.rarity === item.rarity &&
        (o.material.slot === null || o.material.slot === undefined || o.material.slot === item.slot) &&
        (o.material.quality === null || o.material.quality === undefined || o.material.quality === item.quality) &&
        (o.material.statPref === null || o.material.statPref === undefined || (() => {
          const stats = { strength: item.stats.strength, health: item.stats.health, defence: item.stats.defence, speed: item.stats.speed };
          const highest = Math.max(...Object.values(stats));
          const key = o.material.statPref as keyof typeof stats;
          return stats[key] === highest;
        })())
      )
    );
    const chestMatches = char.chestBag.filter((chest) =>
      active.some((o) =>
        o.buyerId !== yourId &&
        o.material.type === "Chest" &&
        o.material.rarity === chest.rarity &&
        (o.material.version === null || o.material.version === undefined || o.material.version === chest.tier)
      )
    );
    const invMatches = matMatches;

    const renderBoSectionHeader = (type: MaterialType, rarity: RarityName, count: number) => {
      const key = `bo-${type}-${rarity}`;
      const expanded = expandedSections.has(key);
      const rc = RARITY_COLORS[rarity] ?? "#9CA3AF";
      return (
        <Pressable
          key={key}
          style={[styles.sectionHeader, { borderLeftColor: rc }]}
          onPress={() => toggleSection(key)}
        >
          <View style={styles.sectionDot}>
            <View style={[styles.sectionDotInner, { backgroundColor: rc }]} />
          </View>
          <Text style={[styles.sectionTitle, { color: rc }]}>
            {rarity.toUpperCase()} {type.toUpperCase()}
          </Text>
          <Text style={styles.sectionCount}>({count})</Text>
          <Text style={styles.sectionArrow}>{expanded ? " ▼" : " ▶"}</Text>
        </Pressable>
      );
    };

    return (
      <View>
        {/* Action row: post button + my items toggle */}
        <View style={styles.orderBtnRow}>
          <Pressable style={[styles.listItemBtn, { flex: 1 }]} onPress={() => setStep("bo-create")}>
            <Text style={styles.listItemBtnTxt}>+ POST BUY ORDER</Text>
          </Pressable>
          {invMatches.length > 0 && (
            <Pressable
              style={[styles.invToggleBtn, showInventoryTop && styles.invToggleBtnActive]}
              onPress={() => setShowInventoryTop((v) => !v)}
            >
              <Feather
                name="package"
                size={12}
                color={showInventoryTop ? Colors.game.gold : Colors.game.textMuted}
              />
              <Text style={[styles.invToggleTxt, showInventoryTop && styles.invToggleTxtActive]}>
                MY ITEMS ({invMatches.length})
              </Text>
            </Pressable>
          )}
        </View>

        {/* Inventory strip */}
        {showInventoryTop && invMatches.length > 0 && (
          <View style={styles.invSection}>
            <Text style={styles.invSectionLabel}>TAP TO QUICK SELL AT BEST PRICE</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.invRow}
            >
              {invMatches.map((entry) => {
                const bestOrder = active
                  .filter((o) =>
                    o.buyerId !== yourId &&
                    o.material.type === entry.material.type &&
                    o.material.rarity === entry.material.rarity &&
                    (o.material.version === null || o.material.version === entry.material.version)
                  )
                  .reduce<BuyOrder | null>(
                    (best, o) => (!best || o.pricePerUnit > best.pricePerUnit ? o : best),
                    null
                  );
                if (!bestOrder) return null;
                const rc = RARITY_COLORS[entry.material.rarity as RarityName] ?? "#9CA3AF";
                return (
                  <Pressable
                    key={entry.key}
                    style={[styles.invCard, { borderColor: rc + "66" }]}
                    onPress={() => handleQuickSell(entry)}
                  >
                    <MaterialImage
                      type={entry.material.type}
                      rarity={entry.material.rarity}
                      version={entry.material.version}
                      size={38} compact animateParticles={false}
                    />
                    <Text style={[styles.invCardRarity, { color: rc }]} numberOfLines={1}>
                      {entry.material.rarity}
                    </Text>
                    <Text style={styles.invCardQty}>×{entry.count}</Text>
                    <View style={styles.invCardPriceRow}>
                      <View style={styles.invCoin}><Text style={styles.invCoinTxt}>G</Text></View>
                      <Text style={styles.invCardPriceTxt}>{bestOrder.pricePerUnit.toLocaleString()}</Text>
                    </View>
                    <View style={styles.quickSellChip}>
                      <Text style={styles.quickSellChipTxt}>SELL</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {renderSortBar()}

        {sorted.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No buy orders posted.</Text>
            <Text style={styles.emptySubText}>Post one to buy items at your price!</Text>
          </View>
        ) : (
          <FlatList
            data={sortedTypes}
            keyExtractor={(t) => t}
            style={styles.listScroll}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: type }) => {
              const rMap = groups.get(type)!;
              const rarityEntries = RARITIES.filter((r) => rMap.has(r)).map((r) => ({
                rarity: r,
                items: rMap.get(r)!.sort((a, b) =>
                  (a.material.version ?? 0) - (b.material.version ?? 0)
                ),
              }));
              return (
                <View style={{ marginBottom: 8 }}>
                  {rarityEntries.map(({ rarity, items }) => {
                    const key = `bo-${type}-${rarity}`;
                    const expanded = expandedSections.has(key);
                    return (
                      <View key={key}>
                        {renderBoSectionHeader(type as MaterialType, rarity as RarityName, items.length)}
                        {expanded && (
                          <View style={styles.sectionBody}>
                            {items.map((o) => {
                              const mType = o.material.type;
                              let matchEntry: MaterialEntry | undefined;
                              let matchItem: GameItem | undefined;
                              let matchChest: ItemChest | undefined;
                              let matchPotion: { rarity: string; tier: number; type: string; id: string } | undefined;
                              if (mType === "Equipment") {
                                matchItem = char.itemBag.find((i) =>
                                  i.rarity === o.material.rarity &&
                                  (o.material.slot === null || o.material.slot === undefined || i.slot === o.material.slot) &&
                                  (o.material.quality === null || o.material.quality === undefined || i.quality === o.material.quality) &&
                                  (o.material.statPref === null || o.material.statPref === undefined || (() => {
                                    const stats = { strength: i.stats.strength, health: i.stats.health, defence: i.stats.defence, speed: i.stats.speed };
                                    const highest = Math.max(...Object.values(stats));
                                    const key = o.material.statPref as keyof typeof stats;
                                    return stats[key] === highest;
                                  })())
                                );
                              } else if (mType === "Chest") {
                                matchChest = char.chestBag.find((c) =>
                                  c.rarity === o.material.rarity &&
                                  (o.material.version === null || o.material.version === undefined || c.tier === o.material.version)
                                );
                              } else if (mType === "Potion") {
                                const p = char.potionBag.find((p) =>
                                  p.rarity === o.material.rarity &&
                                  (o.material.version === null || o.material.version === undefined || p.tier === o.material.version)
                                );
                                if (p) matchPotion = { rarity: p.rarity, tier: p.tier, type: p.type, id: p.id };
                              } else {
                                matchEntry = char.materials.find((e) =>
                                  e.material.type === o.material.type &&
                                  e.material.rarity === o.material.rarity &&
                                  (o.material.version === null || e.material.version === o.material.version) &&
                                  e.count > 0
                                );
                              }
                              return (
                                <BuyOrderCard
                                  key={o.id}
                                  order={o}
                                  isOwn={o.buyerId === yourId}
                                  matchEntry={matchEntry}
                                  matchItem={matchItem}
                                  matchChest={matchChest}
                                  matchPotion={matchPotion}
                                  onFill={(qty) => handleFillOrder(o, qty, matchItem?.id, matchChest?.id, matchPotion?.id)}
                                  onCancel={() => handleCancelOrder(o)}
                                />
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
            contentContainerStyle={{ paddingBottom: 4 }}
          />
        )}
      </View>
    );
  };

  // ── Pick item wizard ───────────────────────────────────────────────────────

  const renderPickStep = () => (
    <View style={styles.wizardArea}>
      <Text style={styles.wizardTitle}>SELECT ITEM TO LIST</Text>
      {char.materials.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No items in inventory.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={styles.pickGrid}>
            {char.materials.map((entry) => {
              const rc = RARITY_COLORS[entry.material.rarity];
              return (
                <Pressable
                  key={entry.key}
                  style={[styles.pickSlot, { borderColor: rc }]}
                  onPress={() => handlePickItem(entry)}
                >
                  <MaterialImage
                    type={entry.material.type} rarity={entry.material.rarity}
                    version={entry.material.version} size={56} compact animateParticles={false}
                  />
                  <Text style={[styles.pickLabel, { color: rc }]}>{entry.material.type}</Text>
                  <Text style={styles.pickCount}>×{entry.count}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
      <Pressable style={styles.backBtn} onPress={() => setStep("tabs")}>
        <Feather name="arrow-left" size={14} color={Colors.game.textMuted} />
        <Text style={styles.backBtnTxt}>BACK</Text>
      </Pressable>
    </View>
  );

  // ── Price wizard ───────────────────────────────────────────────────────────

  const renderPriceStep = () => {
    if (!pickedEntry) return null;
    return (
      <ScrollView style={styles.wizardArea} showsVerticalScrollIndicator={false}>
        <Text style={styles.wizardTitle}>SET LISTING DETAILS</Text>
        <View style={styles.pricePreview}>
          <MaterialImage
            type={pickedEntry.material.type} rarity={pickedEntry.material.rarity}
            version={pickedEntry.material.version} size={64} compact animateParticles={false}
          />
          <View style={{ flex: 1 }}>
            <RarityText
              rarity={pickedEntry.material.rarity} version={pickedEntry.material.version}
              label={`${pickedEntry.material.rarity} ${pickedEntry.material.type}`}
              style={styles.previewName}
            />
            <Text style={styles.previewSub}>In inventory: ×{pickedEntry.count}</Text>
          </View>
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Quantity</Text>
          <TextInput
            style={styles.priceInput}
            keyboardType={Platform.OS === "web" ? "default" : "number-pad"}
            value={countStr}
            onChangeText={(v) => setCountStr(v.replace(/[^0-9]/g, ""))}
            maxLength={4} placeholderTextColor={Colors.game.textMuted}
            placeholder="1" selectionColor={Colors.game.gold}
            {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
          />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Total Price (G)</Text>
          <TextInput
            style={styles.priceInput}
            keyboardType={Platform.OS === "web" ? "default" : "number-pad"}
            value={priceStr}
            onChangeText={(v) => setPriceStr(v.replace(/[^0-9]/g, ""))}
            maxLength={9} placeholderTextColor={Colors.game.textMuted}
            placeholder="100" selectionColor={Colors.game.gold}
            autoFocus={Platform.OS === "web"}
            {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
          />
        </View>
        <View style={styles.wizardBtnRow}>
          <Pressable style={styles.backBtn} onPress={() => setStep("pick")}>
            <Feather name="arrow-left" size={14} color={Colors.game.textMuted} />
            <Text style={styles.backBtnTxt}>BACK</Text>
          </Pressable>
          <Pressable style={styles.confirmBtn} onPress={handleConfirmList}>
            <Text style={styles.confirmBtnTxt}>LIST FOR SALE</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  };

  // ── Item price wizard ─────────────────────────────────────────────────────

  const renderItemPriceStep = () => {
    if (!pickedItem) return null;
    const rc = (ITEM_RARITY_COLORS as Record<string, string>)[pickedItem.rarity] ?? "#9CA3AF";
    return (
      <ScrollView style={styles.wizardArea} showsVerticalScrollIndicator={false}>
        <Text style={styles.wizardTitle}>LIST EQUIPMENT FOR SALE</Text>
        <View style={[styles.pricePreview, { borderColor: rc + "55" }]}>
          <ItemImage slot={pickedItem.slot} rarity={pickedItem.rarity} quality={pickedItem.quality} size={64} compact />
          <View style={{ flex: 1 }}>
            <Text style={[styles.previewName, { color: rc }]} numberOfLines={2}>{pickedItem.name}</Text>
            <Text style={styles.previewSub}>{pickedItem.slot} · T{pickedItem.tier} · {pickedItem.rarity}</Text>
            {!pickedItem.tradable && (
              <Text style={[styles.previewSub, { color: "#F87171" }]}>Account Bound — cannot be sold</Text>
            )}
          </View>
        </View>
        {pickedItem.tradable && (
          <>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Price (G)</Text>
              <TextInput
                style={styles.priceInput}
                keyboardType={Platform.OS === "web" ? "default" : "number-pad"}
                value={priceStr}
                onChangeText={(v) => setPriceStr(v.replace(/[^0-9]/g, ""))}
                maxLength={9} placeholderTextColor={Colors.game.textMuted}
                placeholder="1000" selectionColor={Colors.game.gold}
                autoFocus={Platform.OS === "web"}
                {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
              />
            </View>
            <View style={styles.wizardBtnRow}>
              <Pressable style={styles.backBtn} onPress={() => { setStep("tabs"); setPickedItem(null); }}>
                <Feather name="arrow-left" size={14} color={Colors.game.textMuted} />
                <Text style={styles.backBtnTxt}>CANCEL</Text>
              </Pressable>
              <Pressable style={styles.confirmBtn} onPress={handleConfirmListItem}>
                <Text style={styles.confirmBtnTxt}>LIST FOR SALE</Text>
              </Pressable>
            </View>
          </>
        )}
        {!pickedItem.tradable && (
          <Pressable style={[styles.backBtn, { alignSelf: "center", marginTop: 12 }]} onPress={() => { setStep("tabs"); setPickedItem(null); }}>
            <Feather name="arrow-left" size={14} color={Colors.game.textMuted} />
            <Text style={styles.backBtnTxt}>BACK</Text>
          </Pressable>
        )}
      </ScrollView>
    );
  };

  // ── Chest price wizard ────────────────────────────────────────────────────

  const renderChestPriceStep = () => {
    if (!pickedChest) return null;
    const rc = (ITEM_RARITY_COLORS as Record<string, string>)[pickedChest.rarity] ?? "#F59E0B";
    return (
      <ScrollView style={styles.wizardArea} showsVerticalScrollIndicator={false}>
        <Text style={styles.wizardTitle}>LIST CHEST FOR SALE</Text>
        <View style={[styles.pricePreview, { borderColor: rc + "55" }]}>
          <ChestImage rarity={pickedChest.rarity as ItemRarity} size={64} compact />
          <View style={{ flex: 1 }}>
            <Text style={[styles.previewName, { color: rc }]} numberOfLines={2}>
              {`T${pickedChest.tier} ${pickedChest.rarity} Chest`}
            </Text>
            <Text style={styles.previewSub}>T{pickedChest.tier} · {pickedChest.rarity}</Text>
            {!pickedChest.tradable && (
              <Text style={[styles.previewSub, { color: "#F87171" }]}>Account Bound — cannot be sold</Text>
            )}
          </View>
        </View>
        {pickedChest.tradable && (
          <>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Price (G)</Text>
              <TextInput
                style={styles.priceInput}
                keyboardType={Platform.OS === "web" ? "default" : "number-pad"}
                value={priceStr}
                onChangeText={(v) => setPriceStr(v.replace(/[^0-9]/g, ""))}
                maxLength={9} placeholderTextColor={Colors.game.textMuted}
                placeholder="1000" selectionColor={Colors.game.gold}
                autoFocus={Platform.OS === "web"}
                {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
              />
            </View>
            <View style={styles.wizardBtnRow}>
              <Pressable style={styles.backBtn} onPress={() => { setStep("tabs"); setPickedChest(null); }}>
                <Feather name="arrow-left" size={14} color={Colors.game.textMuted} />
                <Text style={styles.backBtnTxt}>CANCEL</Text>
              </Pressable>
              <Pressable style={styles.confirmBtn} onPress={handleConfirmListChest}>
                <Text style={styles.confirmBtnTxt}>LIST FOR SALE</Text>
              </Pressable>
            </View>
          </>
        )}
        {!pickedChest.tradable && (
          <Pressable style={[styles.backBtn, { alignSelf: "center", marginTop: 12 }]} onPress={() => { setStep("tabs"); setPickedChest(null); }}>
            <Feather name="arrow-left" size={14} color={Colors.game.textMuted} />
            <Text style={styles.backBtnTxt}>BACK</Text>
          </Pressable>
        )}
      </ScrollView>
    );
  };

  // ── Potion price wizard ───────────────────────────────────────────────────

  const renderPotionPriceStep = () => {
    if (!pickedPotion) return null;
    const rc = (ITEM_RARITY_COLORS as Record<string, string>)[pickedPotion.rarity] ?? "#A855F7";
    return (
      <ScrollView style={styles.wizardArea} showsVerticalScrollIndicator={false}>
        <Text style={styles.wizardTitle}>LIST POTION FOR SALE</Text>
        <View style={[styles.pricePreview, { borderColor: rc + "55" }]}>
          <PotionImage type={pickedPotion.type} rarity={pickedPotion.rarity} tier={pickedPotion.tier} size={64} compact />
          <View style={{ flex: 1 }}>
            <Text style={[styles.previewName, { color: rc }]} numberOfLines={2}>
              {pickedPotion.name}
            </Text>
            <Text style={styles.previewSub}>T{pickedPotion.tier} · {pickedPotion.rarity} · {pickedPotion.type}</Text>
          </View>
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Price (G)</Text>
          <TextInput
            style={styles.priceInput}
            keyboardType={Platform.OS === "web" ? "default" : "number-pad"}
            value={priceStr}
            onChangeText={(v) => setPriceStr(v.replace(/[^0-9]/g, ""))}
            maxLength={9} placeholderTextColor={Colors.game.textMuted}
            placeholder="1000" selectionColor={Colors.game.gold}
            autoFocus={Platform.OS === "web"}
            {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
          />
        </View>
        <View style={styles.wizardBtnRow}>
          <Pressable style={styles.backBtn} onPress={() => { setStep("tabs"); setPickedPotion(null); }}>
            <Feather name="arrow-left" size={14} color={Colors.game.textMuted} />
            <Text style={styles.backBtnTxt}>CANCEL</Text>
          </Pressable>
          <Pressable style={styles.confirmBtn} onPress={handleConfirmListPotion}>
            <Text style={styles.confirmBtnTxt}>LIST FOR SALE</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  };

  // ── Buy order creation wizard ──────────────────────────────────────────────

  const renderBoCreate = () => {
    const isEquip = boCategory === "Equipment";
    const isChest = boCategory === "Chest";
    const isMaterial = boCategory && MATERIAL_TYPES.includes(boCategory as MaterialType);
    const isPotion = boCategory === "Potion";
    const total = (parseInt(boCountStr.replace(/[^0-9]/g, ""), 10) || 0) * (parseInt(boPriceStr.replace(/[^0-9]/g, ""), 10) || 0);
    return (
      <ScrollView style={styles.wizardArea} showsVerticalScrollIndicator={false}>
        <Text style={styles.wizardTitle}>POST BUY ORDER</Text>
        <Text style={styles.boHint}>
          Lock gold to buy specific items. Sellers fill your order and receive payment instantly.
        </Text>
        <Text style={styles.boSectionLabel}>ITEM TYPE</Text>
        <View style={styles.boTypeRow}>
          {BO_TYPES.map((t) => (
            <Pressable
              key={t}
              style={[styles.boChip, boCategory === t && styles.boChipActive]}
              onPress={() => {
                setBoCategory(t);
                setBoType(isMaterialType(t) ? (t as MaterialType) : null);
                setBoRarity(null);
                setBoVersion(null);
                setBoSlot(null);
                setBoQuality(null);
                setBoStatPref(null);
              }}
            >
              <Text style={[styles.boChipTxt, boCategory === t && styles.boChipTxtActive]}>{t.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
        {boCategory && (
          <>
            <Text style={styles.boSectionLabel}>RARITY</Text>
            <View style={styles.boRarityGrid}>
              {RARITIES.map((r) => {
                const rc = RARITY_COLORS[r];
                const active = boRarity === r;
                return (
                  <Pressable
                    key={r}
                    style={[styles.boRarityChip, active && { borderColor: rc, backgroundColor: rc + "22" }]}
                    onPress={() => setBoRarity(r)}
                  >
                    <Text style={[styles.boRarityTxt, active && { color: rc }]}>{r.toUpperCase()}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
        {/* Equipment: slot selector */}
        {isEquip && boRarity && (
          <>
            <Text style={styles.boSectionLabel}>SLOT</Text>
            <View style={styles.boTypeRow}>
              {ITEM_SLOTS.map((s) => (
                <Pressable
                  key={s}
                  style={[styles.boChip, boSlot === s && styles.boChipActive]}
                  onPress={() => setBoSlot(s)}
                >
                  <Text style={[styles.boChipTxt, boSlot === s && styles.boChipTxtActive]}>
                    {ITEM_SLOT_ICONS[s]} {s.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        {/* Equipment: quality selector */}
        {isEquip && boSlot && (
          <>
            <Text style={styles.boSectionLabel}>QUALITY (OPTIONAL)</Text>
            <View style={styles.boTypeRow}>
              {([null, ...BO_QUALITIES] as (ItemQuality | null)[]).map((q, idx) => (
                <Pressable
                  key={idx}
                  style={[styles.boChip, boQuality === q && styles.boChipActive]}
                  onPress={() => setBoQuality(q)}
                >
                  <Text style={[styles.boChipTxt, boQuality === q && styles.boChipTxtActive]}>
                    {q ?? "ANY"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        {/* Equipment: stat preference */}
        {isEquip && boSlot && (
          <>
            <Text style={styles.boSectionLabel}>HIGHEST STAT (OPTIONAL)</Text>
            <View style={styles.boTypeRow}>
              {([null, ...BO_STAT_PREFS] as (null | typeof BO_STAT_PREFS[0])[]).map((s, idx) => (
                <Pressable
                  key={idx}
                  style={[styles.boChip, boStatPref === (s?.key ?? null) && styles.boChipActive]}
                  onPress={() => setBoStatPref(s?.key ?? null)}
                >
                  <Text style={[styles.boChipTxt, boStatPref === (s?.key ?? null) && styles.boChipTxtActive]}>
                    {s ? `${s.icon} ${s.label}` : "ANY"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        {/* Material / Chest / Potion: tier selector */}
        {(isMaterial || isChest || isPotion) && boRarity && (
          <>
            <Text style={styles.boSectionLabel}>TIER (OPTIONAL)</Text>
            <View style={styles.boVersionRow}>
              {([null, 0, 1, 2, 3] as (number | null)[]).map((v, idx) => (
                <Pressable
                  key={idx}
                  style={[styles.boChip, boVersion === v && styles.boChipActive]}
                  onPress={() => setBoVersion(v)}
                >
                  <Text style={[styles.boChipTxt, boVersion === v && styles.boChipTxtActive]}>
                    {v === null ? "ANY" : `T${v}`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        {/* Count + price for all categories */}
        {boRarity && (isMaterial || isChest || isPotion || (isEquip && boSlot)) && (
          <>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Quantity Wanted</Text>
              <TextInput
                style={styles.priceInput}
                keyboardType={Platform.OS === "web" ? "default" : "number-pad"}
                value={boCountStr}
                onChangeText={(v) => setBoCountStr(v.replace(/[^0-9]/g, ""))}
                maxLength={4} placeholderTextColor={Colors.game.textMuted}
                placeholder="1" selectionColor={Colors.game.gold}
                {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Price Per Unit (G)</Text>
              <TextInput
                style={styles.priceInput}
                keyboardType={Platform.OS === "web" ? "default" : "number-pad"}
                value={boPriceStr}
                onChangeText={(v) => setBoPriceStr(v.replace(/[^0-9]/g, ""))}
                maxLength={9} placeholderTextColor={Colors.game.textMuted}
                placeholder="50" selectionColor={Colors.game.gold}
                {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
              />
            </View>
            {total > 0 && (
              <View style={styles.boSummary}>
                <View style={styles.goldCoin}><Text style={styles.goldCoinTxt}>G</Text></View>
                <Text style={styles.boSummaryTxt}>{total.toLocaleString()} gold will be locked</Text>
              </View>
            )}
          </>
        )}
        <View style={styles.wizardBtnRow}>
          <Pressable style={styles.backBtn} onPress={() => setStep("tabs")}>
            <Feather name="arrow-left" size={14} color={Colors.game.textMuted} />
            <Text style={styles.backBtnTxt}>BACK</Text>
          </Pressable>
          {boRarity && (isMaterial || isChest || isPotion || (isEquip && boSlot)) && (
            <Pressable style={styles.confirmBtn} onPress={handleConfirmBoCreate}>
              <Text style={styles.confirmBtnTxt}>POST ORDER</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    );
  };

  // ── Tab bar counts ────────────────────────────────────────────────────────

  const listingsCount = (applyTypeFilter(listings) as AuctionListing[]).length;
  const ordersCount = (applyTypeFilter(buyOrders.filter((o) => o.count - o.filled > 0)) as BuyOrder[]).length;

  const showFilters = step === "tabs";
  const showTabs = step === "tabs";

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>AUCTION HOUSE</Text>
            <View style={styles.headerRight}>
              <View style={styles.goldPill}>
                <View style={styles.goldCoin}><Text style={styles.goldCoinTxt}>G</Text></View>
                <Text style={styles.goldAmt}>{char.gold.toLocaleString()}</Text>
              </View>
              <Pressable style={styles.refreshBtn} onPress={handleRefresh} hitSlop={8}>
                <Feather name="refresh-cw" size={16} color={Colors.game.textDim} />
              </Pressable>
            </View>
          </View>

          {/* Feedback */}
          {feedback && (
            <View style={[styles.feedbackBanner, !feedback.ok && styles.feedbackBannerErr]}>
              <Text style={[styles.feedbackText, !feedback.ok && styles.feedbackTextErr]}>
                {feedback.msg}
              </Text>
            </View>
          )}

          {showFilters && renderFilters()}

          {showTabs && (
            <View style={styles.tabs}>
              <Pressable
                style={[styles.tabBtn, tab === "listings" && styles.tabBtnActive]}
                onPress={() => setTab("listings")}
              >
                <Text style={[styles.tabBtnTxt, tab === "listings" && styles.tabBtnTxtActive]}>
                  SELL ({listingsCount})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tabBtn, tab === "orders" && styles.tabBtnActive]}
                onPress={() => setTab("orders")}
              >
                <Text style={[styles.tabBtnTxt, tab === "orders" && styles.tabBtnTxtActive]}>
                  BUY ORDERS ({ordersCount})
                </Text>
              </Pressable>
            </View>
          )}

          {/* Scrollable content area */}
          <ScrollView
            style={styles.contentScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === "tabs" && tab === "listings" && renderListings()}
            {step === "tabs" && tab === "orders" && renderOrders()}
            {step === "pick" && renderPickStep()}
            {step === "price" && renderPriceStep()}
            {step === "item-price" && renderItemPriceStep()}
            {step === "chest-price" && renderChestPriceStep()}
            {step === "potion-price" && renderPotionPriceStep()}
            {step === "bo-create" && renderBoCreate()}
          </ScrollView>

          <Pressable style={styles.closeBtn} onPress={handleClose}>
            <Text style={styles.closeBtnTxt}>CLOSE</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.game.surfaceAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: "92%",
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.game.border,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: Colors.game.border,
    borderRadius: 2, alignSelf: "center", marginBottom: 14,
  },
  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10,
  },
  headerTitle: {
    fontSize: 14, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 3,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  goldPill: { flexDirection: "row", alignItems: "center", gap: 6 },
  goldCoin: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.game.gold,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#a07820",
  },
  goldCoinTxt: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#3d2e00" },
  goldAmt: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  refreshBtn: {
    padding: 6, borderRadius: 8,
    backgroundColor: Colors.game.surface,
    borderWidth: 1, borderColor: Colors.game.border,
  },
  feedbackBanner: {
    backgroundColor: "rgba(34,197,94,0.10)", borderRadius: 8,
    paddingVertical: 7, paddingHorizontal: 12,
    marginBottom: 10, alignItems: "center",
    borderWidth: 1, borderColor: Colors.game.green,
  },
  feedbackBannerErr: {
    backgroundColor: "rgba(239,68,68,0.10)",
    borderColor: Colors.game.red,
  },
  feedbackText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.game.green },
  feedbackTextErr: { color: Colors.game.red },
  filterScroll: { marginBottom: 10 },
  filterRow: { flexDirection: "row", gap: 6, paddingHorizontal: 2 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: Colors.game.border,
    backgroundColor: Colors.game.surface,
  },
  filterChipActive: {
    borderColor: Colors.game.gold,
    backgroundColor: "rgba(201,168,76,0.12)",
  },
  filterChipTxt: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 1.2,
  },
  filterChipTxtActive: { color: Colors.game.gold },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tabBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.game.surface,
    borderWidth: 1, borderColor: Colors.game.border,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: "rgba(201,168,76,0.12)",
    borderColor: Colors.game.gold,
  },
  tabBtnTxt: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 1.5,
  },
  tabBtnTxtActive: { color: Colors.game.gold },
  // Scrollable content area
  contentScroll: {
    maxHeight: 420,
    marginBottom: 10,
  },
  listScroll: {
    maxHeight: 230,
  },
  // Sort bar
  sortBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sortLabel: {
    fontSize: 9, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 1.5,
  },
  sortBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1,
    borderColor: Colors.game.border,
    backgroundColor: Colors.game.surface,
  },
  sortBtnActive: {
    borderColor: Colors.game.purpleLight,
    backgroundColor: "rgba(167,139,250,0.12)",
  },
  sortBtnTxt: {
    fontSize: 9, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 0.8,
  },
  sortBtnTxtActive: { color: Colors.game.purpleLight },
  // Action row (orders tab)
  orderBtnRow: {
    flexDirection: "row", gap: 8,
    marginBottom: 8, alignItems: "stretch",
  },
  // Inventory top section
  invToggleBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.game.border,
    backgroundColor: Colors.game.surface,
  },
  invToggleBtnActive: {
    borderColor: Colors.game.gold,
    backgroundColor: "rgba(201,168,76,0.10)",
  },
  invToggleTxt: {
    fontSize: 9, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 1,
  },
  invToggleTxtActive: { color: Colors.game.gold },
  invSection: {
    borderRadius: 12, borderWidth: 1,
    borderColor: Colors.game.border,
    backgroundColor: Colors.game.surface,
    paddingVertical: 8,
    marginBottom: 8,
  },
  invSectionLabel: {
    fontSize: 8, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 1.5,
    textAlign: "center", marginBottom: 8,
  },
  invRow: {
    flexDirection: "row", gap: 8,
    paddingHorizontal: 10, paddingBottom: 2,
  },
  invCard: {
    width: 72, alignItems: "center", gap: 3,
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 10, padding: 8,
    borderWidth: 1.5,
  },
  invCardRarity: {
    fontSize: 8, fontFamily: "Inter_700Bold",
    letterSpacing: 0.3, textAlign: "center",
  },
  invCardQty: {
    fontSize: 9, fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted,
  },
  invCardPriceRow: {
    flexDirection: "row", alignItems: "center", gap: 3,
  },
  invCoin: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.game.gold,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#a07820",
  },
  invCoinTxt: { fontSize: 5, fontFamily: "Inter_700Bold", color: "#3d2e00" },
  invCardPriceTxt: {
    fontSize: 9, fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
  },
  quickSellChip: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.game.green,
  },
  quickSellChipTxt: {
    fontSize: 8, fontFamily: "Inter_700Bold",
    color: Colors.game.green, letterSpacing: 0.5,
  },
  emptyBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 30 },
  emptyText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.game.textDim, textAlign: "center" },
  emptySubText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textMuted, textAlign: "center" },
  listItemBtn: {
    backgroundColor: "rgba(201,168,76,0.08)", borderRadius: 12,
    paddingVertical: 10, alignItems: "center",
    borderWidth: 1, borderColor: Colors.game.gold,
  },
  listItemBtnTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.game.gold, letterSpacing: 2 },
  listingCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.game.surface, borderRadius: 14,
    padding: 10, borderWidth: 1,
  },
  ownCard: { backgroundColor: "rgba(255,255,255,0.03)" },
  listingImg: { width: 54, height: 54 },
  listingInfo: { flex: 1 },
  listingName: { fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 2 },
  listingMeta: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },
  boRemaining: { fontSize: 9, fontFamily: "Inter_400Regular", color: Colors.game.textMuted, marginTop: 2 },
  listingRight: { alignItems: "flex-end", gap: 5 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  priceText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  perEach: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },
  buyBtn: {
    backgroundColor: Colors.game.green + "22", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.game.green,
  },
  buyBtnDisabled: { borderColor: Colors.game.border, backgroundColor: "transparent" },
  buyBtnTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.game.green, letterSpacing: 1 },
  buyBtnTxtDim: { color: Colors.game.textMuted },
  cancelBtn: {
    backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.game.red,
  },
  cancelBtnTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.game.red, letterSpacing: 1 },
  fillBtn: {
    backgroundColor: "rgba(34,197,94,0.12)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.game.green,
  },
  fillBtnTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.game.green, letterSpacing: 1 },
  noItemTag: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.game.border,
  },
  noItemTagTxt: { fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.game.textMuted },
  fillCol: { alignItems: "flex-end", gap: 4 },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: Colors.game.surfaceAlt, borderWidth: 1, borderColor: Colors.game.border,
    alignItems: "center", justifyContent: "center",
  },
  stepBtnTxt: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.game.text, lineHeight: 16 },
  stepQty: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.game.text, minWidth: 28, textAlign: "center" },
  // Wizard
  wizardArea: { marginBottom: 10 },
  wizardTitle: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 3,
    marginBottom: 10, textAlign: "center",
  },
  pickGrid: {
    flexDirection: "row", flexWrap: "wrap",
    gap: 10, justifyContent: "center", paddingBottom: 10,
  },
  pickSlot: {
    width: 74, alignItems: "center", gap: 4,
    backgroundColor: Colors.game.surface, borderRadius: 12,
    padding: 8, borderWidth: 2,
  },
  pickLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5, textAlign: "center" },
  pickCount: { fontSize: 9, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },
  pricePreview: {
    flexDirection: "row", gap: 12, alignItems: "center",
    backgroundColor: Colors.game.surface, borderRadius: 12,
    padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.game.border,
  },
  previewName: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 3 },
  previewSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  inputLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 1.5, flex: 1,
  },
  priceInput: {
    width: 120, backgroundColor: Colors.game.surface,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.game.border,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, textAlign: "right",
  },
  wizardBtnRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginTop: 6,
  },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.game.border,
    backgroundColor: Colors.game.surface,
  },
  backBtnTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 1 },
  confirmBtn: {
    backgroundColor: Colors.game.gold, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 20,
    alignItems: "center",
  },
  confirmBtnTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.game.background, letterSpacing: 1.5 },
  closeBtn: {
    backgroundColor: Colors.game.surface,
    borderRadius: 14, paddingVertical: 12, alignItems: "center",
    borderWidth: 1, borderColor: Colors.game.border,
  },
  closeBtnTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 2 },
  // Collapsible sections
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.game.surface,
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: Colors.game.border,
    borderLeftWidth: 4,
    marginBottom: 2,
  },
  sectionDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  sectionDotInner: {
    width: 6, height: 6, borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    letterSpacing: 1.2, flex: 1,
  },
  sectionCount: {
    fontSize: 10, fontFamily: "Inter_600SemiBold",
    color: Colors.game.textMuted,
  },
  sectionArrow: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
  },
  sectionBody: {
    gap: 8, paddingVertical: 8,
    paddingHorizontal: 4,
  },
  // Buy order creation
  boHint: {
    fontSize: 11, fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted, textAlign: "center",
    marginBottom: 14, lineHeight: 16,
  },
  boSectionLabel: {
    fontSize: 9, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 2,
    marginBottom: 8, marginTop: 4,
  },
  boTypeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  boVersionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  boChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5, borderColor: Colors.game.border,
    backgroundColor: Colors.game.surface,
  },
  boChipActive: {
    borderColor: Colors.game.gold,
    backgroundColor: "rgba(201,168,76,0.15)",
  },
  boChipTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 1 },
  boChipTxtActive: { color: Colors.game.gold },
  boRarityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  boRarityChip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1.5, borderColor: Colors.game.border,
    backgroundColor: Colors.game.surface,
  },
  boRarityTxt: { fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 1 },
  boSummary: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(201,168,76,0.08)", borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.game.gold,
  },
  boSummaryTxt: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  equipPlaceholder: {
    width: 54, height: 54, borderRadius: 12,
    borderWidth: 2,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.game.surface,
  },
  equipPlaceholderText: {
    fontSize: 24,
  },
});
