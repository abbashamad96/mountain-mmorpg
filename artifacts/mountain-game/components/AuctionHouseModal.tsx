import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Material,
  MaterialEntry,
  MaterialType,
  RARITIES,
  RARITY_COLORS,
  RarityName,
  VersionNum,
  useGame,
} from "@/context/GameContext";
import { MaterialImage } from "./MaterialImage";
import { RarityText } from "./RarityText";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "listings" | "orders";
type Step = "tabs" | "pick" | "price" | "bo-create";
type FilterType = "All" | MaterialType;

const FILTER_TYPES: FilterType[] = ["All", "Ore", "Wood", "Herb", "Leather"];
const MATERIAL_TYPES: MaterialType[] = ["Ore", "Wood", "Herb", "Leather"];

// ─── Sell listing card ────────────────────────────────────────────────────────

function ListingCard({
  listing,
  isOwn,
  canAfford,
  onBuy,
  onCancel,
}: {
  listing: AuctionListing;
  isOwn: boolean;
  canAfford: boolean;
  onBuy: () => void;
  onCancel: () => void;
}) {
  const rarityColor = RARITY_COLORS[listing.material.rarity as RarityName] ?? "#9CA3AF";
  return (
    <View style={[styles.listingCard, isOwn && styles.ownCard, { borderColor: rarityColor + "55" }]}>
      <View style={styles.listingImg}>
        <MaterialImage
          type={listing.material.type as MaterialType}
          rarity={listing.material.rarity as RarityName}
          version={listing.material.version as VersionNum}
          size={54}
          compact
          animateParticles={false}
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
            onPress={onBuy}
            disabled={!canAfford}
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
  order,
  isOwn,
  matchEntry,
  onFill,
  onCancel,
}: {
  order: BuyOrder;
  isOwn: boolean;
  matchEntry: MaterialEntry | undefined;
  onFill: (qty: number) => void;
  onCancel: () => void;
}) {
  const remaining = order.count - order.filled;
  const maxFill = matchEntry ? Math.min(matchEntry.count, remaining) : 0;
  const rarityColor = RARITY_COLORS[order.material.rarity as RarityName] ?? "#9CA3AF";
  const displayVersion = (order.material.version ?? 0) as VersionNum;

  const [qty, setQty] = useState(maxFill);
  useEffect(() => { setQty(maxFill); }, [maxFill]);

  return (
    <View style={[styles.listingCard, isOwn && styles.ownCard, { borderColor: rarityColor + "55" }]}>
      <View style={styles.listingImg}>
        <MaterialImage
          type={order.material.type as MaterialType}
          rarity={order.material.rarity as RarityName}
          version={displayVersion}
          size={54}
          compact
          animateParticles={false}
        />
      </View>
      <View style={styles.listingInfo}>
        <RarityText
          rarity={order.material.rarity as RarityName}
          version={displayVersion}
          label={`${order.material.rarity} ${order.material.type}`}
          style={styles.listingName}
        />
        <Text style={styles.listingMeta}>
          {order.material.version === null ? "Any tier" : `T${order.material.version}`}  ·  {isOwn ? "YOUR ORDER" : order.buyerName}
        </Text>
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
                <Pressable
                  style={styles.stepBtn}
                  onPress={() => setQty((q) => Math.max(1, q - 1))}
                  hitSlop={6}
                >
                  <Text style={styles.stepBtnTxt}>−</Text>
                </Pressable>
                <Text style={styles.stepQty}>×{qty}</Text>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() => setQty((q) => Math.min(maxFill, q + 1))}
                  hitSlop={6}
                >
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

// ─── Main modal ───────────────────────────────────────────────────────────────

interface AuctionHouseModalProps {
  visible: boolean;
  onClose: () => void;
  preSelectedEntry?: MaterialEntry | null;
}

export function AuctionHouseModal({ visible, onClose, preSelectedEntry }: AuctionHouseModalProps) {
  const { gameState, removeMaterial, applyGoldXp } = useGame();
  const {
    yourId,
    listings,
    listAhItem, buyAhItem, cancelAhListing, refreshListings,
    buyOrders,
    createBuyOrder, cancelBuyOrder, fillBuyOrder,
  } = useMultiplayer();
  const char = gameState.character;

  const [tab, setTab] = useState<Tab>("listings");
  const [step, setStep] = useState<Step>("tabs");
  const [pickedEntry, setPickedEntry] = useState<MaterialEntry | null>(null);
  const [countStr, setCountStr] = useState("1");
  const [priceStr, setPriceStr] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("All");
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  // Buy order creation form state
  const [boType, setBoType] = useState<MaterialType | null>(null);
  const [boRarity, setBoRarity] = useState<RarityName | null>(null);
  const [boVersion, setBoVersion] = useState<number | null>(null);
  const [boCountStr, setBoCountStr] = useState("1");
  const [boPriceStr, setBoPriceStr] = useState("");

  // Handle pre-selected entry from inventory
  useEffect(() => {
    if (visible && preSelectedEntry) {
      setPickedEntry(preSelectedEntry);
      setCountStr("1");
      setPriceStr("");
      setStep("price");
      setTab("listings");
    }
    if (!visible) {
      setStep("tabs");
      setPickedEntry(null);
    }
  }, [visible, preSelectedEntry]);

  const showFeedback = useCallback((msg: string, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 2500);
  }, []);

  const applyFilter = (list: (AuctionListing | BuyOrder)[]) =>
    typeFilter === "All" ? list : list.filter((item) => item.material.type === typeFilter);

  // ── Sell listing actions ───────────────────────────────────────────────────

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

  // ── Buy order actions ──────────────────────────────────────────────────────

  const handleFillOrder = useCallback((order: BuyOrder, qty: number) => {
    const matchEntry = char.materials.find((e) =>
      e.material.type === order.material.type &&
      e.material.rarity === order.material.rarity &&
      (order.material.version === null || e.material.version === order.material.version) &&
      e.count > 0
    );
    if (!matchEntry) { showFeedback("You don't have this item.", false); return; }
    const remaining = order.count - order.filled;
    const fillCount = Math.min(qty, matchEntry.count, remaining);
    if (fillCount <= 0) return;
    const goldEarned = fillCount * order.pricePerUnit;
    removeMaterial(matchEntry.key, fillCount);
    fillBuyOrder(order.id, fillCount, matchEntry.material.version);
    showFeedback(`Sold ×${fillCount} — ${goldEarned.toLocaleString()}G incoming!`);
  }, [char.materials, removeMaterial, fillBuyOrder, showFeedback]);

  const handleCancelOrder = useCallback((order: BuyOrder) => {
    cancelBuyOrder(order.id);
    showFeedback("Buy order cancelled…");
  }, [cancelBuyOrder, showFeedback]);

  const handleConfirmBoCreate = () => {
    if (!boType || !boRarity) { showFeedback("Select type and rarity first.", false); return; }
    const count = parseInt(boCountStr.replace(/[^0-9]/g, ""), 10) || 0;
    const pricePerUnit = parseInt(boPriceStr.replace(/[^0-9]/g, ""), 10) || 0;
    if (count <= 0) { showFeedback("Enter a valid quantity.", false); return; }
    if (pricePerUnit <= 0) { showFeedback("Enter a price above 0.", false); return; }
    const total = count * pricePerUnit;
    if (char.gold < total) { showFeedback(`Not enough gold (need ${total.toLocaleString()}G).`, false); return; }
    applyGoldXp(-total, 0);
    createBuyOrder({ type: boType, rarity: boRarity, version: boVersion }, count, pricePerUnit);
    setStep("tabs");
    setTab("orders");
    setBoType(null); setBoRarity(null); setBoVersion(null);
    setBoCountStr("1"); setBoPriceStr("");
    showFeedback(`Buy order posted! ${total.toLocaleString()}G locked.`);
  };

  const handleRefresh = () => { refreshListings(); showFeedback("Refreshed."); };

  const handleClose = () => {
    setStep("tabs");
    setPickedEntry(null);
    setBoType(null); setBoRarity(null); setBoVersion(null);
    setBoCountStr("1"); setBoPriceStr("");
    onClose();
  };

  // ── Filter chips ───────────────────────────────────────────────────────────

  const renderFilters = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterRow}
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

  // ── Sell listings tab ──────────────────────────────────────────────────────

  const renderListings = () => {
    const filtered = applyFilter(listings) as AuctionListing[];
    return (
      <View style={styles.listArea}>
        <Pressable style={styles.listItemBtn} onPress={() => setStep("pick")}>
          <Text style={styles.listItemBtnTxt}>+ LIST AN ITEM</Text>
        </Pressable>
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {listings.length === 0 ? "No listings yet." : "No listings match this filter."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(l) => l.id}
            renderItem={({ item }) => (
              <ListingCard
                listing={item}
                isOwn={item.sellerId === yourId}
                canAfford={char.gold >= item.price}
                onBuy={() => handleBuy(item)}
                onCancel={() => handleCancel(item)}
              />
            )}
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  };

  // ── Buy orders tab ─────────────────────────────────────────────────────────

  const renderOrders = () => {
    const active = buyOrders.filter((o) => o.count - o.filled > 0);
    const filtered = applyFilter(active) as BuyOrder[];
    return (
      <View style={styles.listArea}>
        <Pressable style={styles.listItemBtn} onPress={() => setStep("bo-create")}>
          <Text style={styles.listItemBtnTxt}>+ POST BUY ORDER</Text>
        </Pressable>
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No buy orders posted.</Text>
            <Text style={styles.emptySubText}>Post one to buy items at your price!</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(o) => o.id}
            renderItem={({ item }) => {
              const matchEntry = char.materials.find((e) =>
                e.material.type === item.material.type &&
                e.material.rarity === item.material.rarity &&
                (item.material.version === null || e.material.version === item.material.version) &&
                e.count > 0
              );
              return (
                <BuyOrderCard
                  order={item}
                  isOwn={item.buyerId === yourId}
                  matchEntry={matchEntry}
                  onFill={(qty) => handleFillOrder(item, qty)}
                  onCancel={() => handleCancelOrder(item)}
                />
              );
            }}
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
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
                    type={entry.material.type}
                    rarity={entry.material.rarity}
                    version={entry.material.version}
                    size={56}
                    compact
                    animateParticles={false}
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
            type={pickedEntry.material.type}
            rarity={pickedEntry.material.rarity}
            version={pickedEntry.material.version}
            size={64}
            compact
            animateParticles={false}
          />
          <View style={{ flex: 1 }}>
            <RarityText
              rarity={pickedEntry.material.rarity}
              version={pickedEntry.material.version}
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
            maxLength={4}
            placeholderTextColor={Colors.game.textMuted}
            placeholder="1"
            selectionColor={Colors.game.gold}
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
            maxLength={9}
            placeholderTextColor={Colors.game.textMuted}
            placeholder="100"
            selectionColor={Colors.game.gold}
            autoFocus={Platform.OS === "web"}
            {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
          />
        </View>

        <View style={styles.wizardBtnRow}>
          <Pressable style={styles.backBtn} onPress={() => { setStep("pick"); }}>
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

  // ── Buy order creation wizard ──────────────────────────────────────────────

  const renderBoCreate = () => {
    const total = (parseInt(boCountStr.replace(/[^0-9]/g,""),10)||0) * (parseInt(boPriceStr.replace(/[^0-9]/g,""),10)||0);
    return (
      <ScrollView style={styles.wizardArea} showsVerticalScrollIndicator={false}>
        <Text style={styles.wizardTitle}>POST BUY ORDER</Text>
        <Text style={styles.boHint}>
          Lock gold to buy specific items. Sellers fill your order and receive payment instantly.
        </Text>

        {/* Material type */}
        <Text style={styles.boSectionLabel}>MATERIAL TYPE</Text>
        <View style={styles.boTypeRow}>
          {MATERIAL_TYPES.map((t) => (
            <Pressable
              key={t}
              style={[styles.boChip, boType === t && styles.boChipActive]}
              onPress={() => { setBoType(t); setBoRarity(null); }}
            >
              <Text style={[styles.boChipTxt, boType === t && styles.boChipTxtActive]}>{t.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {/* Rarity */}
        {boType && (
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
                    <Text style={[styles.boRarityTxt, active && { color: rc }]}>
                      {r.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Version */}
        {boRarity && (
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

        {/* Count + Price */}
        {boRarity && (
          <>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Quantity Wanted</Text>
              <TextInput
                style={styles.priceInput}
                keyboardType={Platform.OS === "web" ? "default" : "number-pad"}
                value={boCountStr}
                onChangeText={(v) => setBoCountStr(v.replace(/[^0-9]/g, ""))}
                maxLength={4}
                placeholderTextColor={Colors.game.textMuted}
                placeholder="1"
                selectionColor={Colors.game.gold}
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
                maxLength={9}
                placeholderTextColor={Colors.game.textMuted}
                placeholder="50"
                selectionColor={Colors.game.gold}
                {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
              />
            </View>
            {total > 0 && (
              <View style={styles.boSummary}>
                <View style={styles.goldCoin}><Text style={styles.goldCoinTxt}>G</Text></View>
                <Text style={styles.boSummaryTxt}>
                  {total.toLocaleString()} gold will be locked
                </Text>
              </View>
            )}
          </>
        )}

        <View style={styles.wizardBtnRow}>
          <Pressable style={styles.backBtn} onPress={() => setStep("tabs")}>
            <Feather name="arrow-left" size={14} color={Colors.game.textMuted} />
            <Text style={styles.backBtnTxt}>BACK</Text>
          </Pressable>
          {boRarity && (
            <Pressable style={styles.confirmBtn} onPress={handleConfirmBoCreate}>
              <Text style={styles.confirmBtnTxt}>POST ORDER</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    );
  };

  // ── Tab bar counts ─────────────────────────────────────────────────────────

  const listingsCount = (applyFilter(listings) as AuctionListing[]).length;
  const ordersCount = (applyFilter(buyOrders.filter((o) => o.count - o.filled > 0)) as BuyOrder[]).length;

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

          {step === "tabs" && tab === "listings" && renderListings()}
          {step === "tabs" && tab === "orders" && renderOrders()}
          {step === "pick" && renderPickStep()}
          {step === "price" && renderPriceStep()}
          {step === "bo-create" && renderBoCreate()}

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
  listArea: { height: 260, marginBottom: 10 },
  emptyBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 6 },
  emptyText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.game.textDim, textAlign: "center" },
  emptySubText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textMuted, textAlign: "center" },
  listItemBtn: {
    backgroundColor: "rgba(201,168,76,0.08)", borderRadius: 12,
    paddingVertical: 10, alignItems: "center", marginBottom: 10,
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
  wizardArea: { height: 340, marginBottom: 10 },
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
});
