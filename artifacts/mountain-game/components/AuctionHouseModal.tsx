import { Feather } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
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
import { AuctionListing, useMultiplayer } from "@/context/MultiplayerContext";
import { Material, MaterialEntry, MaterialType, RARITY_COLORS, useGame } from "@/context/GameContext";
import { MaterialImage } from "./MaterialImage";
import { RarityText } from "./RarityText";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "browse" | "mine";
type Step = "tabs" | "pick" | "price";
type FilterType = "All" | MaterialType;

const FILTER_TYPES: FilterType[] = ["All", "Ore", "Wood", "Herb", "Leather"];

// ─── Listing card ────────────────────────────────────────────────────────────

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
  const rarityColor = RARITY_COLORS[listing.material.rarity as keyof typeof RARITY_COLORS] ?? "#9CA3AF";
  return (
    <View style={[styles.listingCard, { borderColor: rarityColor + "55" }]}>
      <View style={styles.listingImg}>
        <MaterialImage
          type={listing.material.type as any}
          rarity={listing.material.rarity as any}
          version={listing.material.version as any}
          size={54}
          compact
          animateParticles={Platform.OS === "web"}
        />
      </View>
      <View style={styles.listingInfo}>
        <RarityText
          rarity={listing.material.rarity as any}
          version={listing.material.version as any}
          label={`${listing.material.rarity} ${listing.material.type}`}
          style={styles.listingName}
        />
        <Text style={styles.listingMeta}>×{listing.count}  ·  {listing.sellerName}</Text>
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

// ─── Main modal ───────────────────────────────────────────────────────────────

interface AuctionHouseModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AuctionHouseModal({ visible, onClose }: AuctionHouseModalProps) {
  const { gameState, removeMaterial, applyGoldXp } = useGame();
  const { yourId, listings, listAhItem, buyAhItem, cancelAhListing, refreshListings } = useMultiplayer();
  const char = gameState.character;

  const [tab, setTab] = useState<Tab>("browse");
  const [step, setStep] = useState<Step>("tabs");
  const [pickedEntry, setPickedEntry] = useState<MaterialEntry | null>(null);
  const [countStr, setCountStr] = useState("1");
  const [priceStr, setPriceStr] = useState("");
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [typeFilter, setTypeFilter] = useState<FilterType>("All");

  const myListings = listings.filter((l) => l.sellerId === yourId);
  const otherListings = listings.filter((l) => l.sellerId !== yourId);

  const applyFilter = (list: AuctionListing[]) =>
    typeFilter === "All" ? list : list.filter((l) => l.material.type === typeFilter);

  const showFeedback = useCallback((msg: string, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 2500);
  }, []);

  const handleBuy = useCallback((listing: AuctionListing) => {
    if (char.gold < listing.price) { showFeedback("Not enough gold!", false); return; }
    applyGoldXp(-listing.price, 0);
    buyAhItem(listing.id);
    showFeedback(`Purchase sent — items incoming!`);
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
    // Parse inputs — handle non-numeric gracefully
    const parsedCount = parseInt(countStr.replace(/[^0-9]/g, ""), 10);
    const parsedPrice = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    const count = isNaN(parsedCount) || parsedCount < 1 ? 1 : Math.min(parsedCount, pickedEntry.count);
    const price = isNaN(parsedPrice) ? 0 : parsedPrice;
    if (price <= 0) { showFeedback("Enter a price above 0.", false); return; }
    removeMaterial(pickedEntry.key, count);
    listAhItem(pickedEntry.material, count, price);
    setStep("tabs");
    setTab("mine");
    setPickedEntry(null);
    showFeedback("Item listed successfully!");
  };

  const handleRefresh = () => {
    refreshListings();
    showFeedback("Listings refreshed.");
  };

  const handleClose = () => {
    setStep("tabs");
    setPickedEntry(null);
    onClose();
  };

  // ── Render filter chips ────────────────────────────────────────────────────

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

  // ── Render tabs ────────────────────────────────────────────────────────────

  const renderBrowse = () => {
    const filtered = applyFilter(otherListings);
    return (
      <View style={styles.listArea}>
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {otherListings.length === 0 ? "No listings yet." : "No listings match this filter."}
            </Text>
            {otherListings.length === 0 && (
              <Text style={styles.emptySubText}>Be the first to list something!</Text>
            )}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(l) => l.id}
            renderItem={({ item }) => (
              <ListingCard
                listing={item}
                isOwn={false}
                canAfford={char.gold >= item.price}
                onBuy={() => handleBuy(item)}
                onCancel={() => {}}
              />
            )}
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  };

  const renderMine = () => {
    const filtered = applyFilter(myListings);
    return (
      <View style={styles.listArea}>
        <Pressable style={styles.listItemBtn} onPress={() => setStep("pick")}>
          <Text style={styles.listItemBtnTxt}>+ LIST AN ITEM</Text>
        </Pressable>
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {myListings.length === 0 ? "No active listings." : "No listings match this filter."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(l) => l.id}
            renderItem={({ item }) => (
              <ListingCard
                listing={item}
                isOwn
                canAfford={false}
                onBuy={() => {}}
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
                  <Text style={[styles.pickLabel, { color: rc }]}>
                    {entry.material.type}
                  </Text>
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

  // ── Final render ───────────────────────────────────────────────────────────

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

          {/* Filters (visible in tabs mode) */}
          {showFilters && renderFilters()}

          {/* Tabs (visible in tabs mode) */}
          {showTabs && (
            <View style={styles.tabs}>
              <Pressable
                style={[styles.tabBtn, tab === "browse" && styles.tabBtnActive]}
                onPress={() => setTab("browse")}
              >
                <Text style={[styles.tabBtnTxt, tab === "browse" && styles.tabBtnTxtActive]}>
                  BROWSE ({applyFilter(otherListings).length})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tabBtn, tab === "mine" && styles.tabBtnActive]}
                onPress={() => setTab("mine")}
              >
                <Text style={[styles.tabBtnTxt, tab === "mine" && styles.tabBtnTxtActive]}>
                  MY LISTINGS ({myListings.length})
                </Text>
              </Pressable>
            </View>
          )}

          {/* Content area */}
          {step === "tabs" && tab === "browse" && renderBrowse()}
          {step === "tabs" && tab === "mine" && renderMine()}
          {step === "pick" && renderPickStep()}
          {step === "price" && renderPriceStep()}

          {/* Close */}
          <Pressable style={styles.closeBtn} onPress={handleClose}>
            <Text style={styles.closeBtnTxt}>CLOSE</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

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
  listingImg: { width: 54, height: 54 },
  listingInfo: { flex: 1 },
  listingName: { fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 2 },
  listingMeta: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },
  listingRight: { alignItems: "flex-end", gap: 6 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  priceText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.game.gold },
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
  // Wizard
  wizardArea: {
    height: 340, marginBottom: 10,
  },
  wizardTitle: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 3,
    marginBottom: 14, textAlign: "center",
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
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    color: Colors.game.textDim, width: 120,
  },
  priceInput: {
    flex: 1, backgroundColor: Colors.game.surface,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.game.gold,
    borderWidth: 1, borderColor: Colors.game.border,
    outlineStyle: "none",
  } as any,
  wizardBtnRow: {
    flexDirection: "row", gap: 10, marginTop: 4, marginBottom: 10,
  },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16,
    borderWidth: 1, borderColor: Colors.game.border,
  },
  backBtnTxt: {
    fontSize: 12, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 1.5,
  },
  confirmBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 11,
    backgroundColor: "rgba(201,168,76,0.12)", alignItems: "center",
    borderWidth: 1, borderColor: Colors.game.gold,
  },
  confirmBtnTxt: {
    fontSize: 12, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 1.5,
  },
  closeBtn: {
    backgroundColor: Colors.game.surface, borderRadius: 14,
    paddingVertical: 14, alignItems: "center",
    borderWidth: 1, borderColor: Colors.game.border,
  },
  closeBtnTxt: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 2 },
});
