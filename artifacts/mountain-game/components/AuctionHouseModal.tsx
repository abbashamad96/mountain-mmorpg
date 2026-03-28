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
import { Material, MaterialEntry, RARITY_COLORS, useGame } from "@/context/GameContext";
import { MaterialImage } from "./MaterialImage";
import { RarityText } from "./RarityText";

type Tab = "browse" | "mine";
type ListStep = "pick" | "price" | null;

interface AuctionHouseModalProps {
  visible: boolean;
  onClose: () => void;
}

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
    <View style={[styles.listingCard, { borderColor: rarityColor + "60" }]}>
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
        <Text style={styles.listingMeta}>
          ×{listing.count}  ·  by {listing.sellerName}
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

export function AuctionHouseModal({ visible, onClose }: AuctionHouseModalProps) {
  const { gameState, removeMaterial, applyGoldXp } = useGame();
  const { yourId, listings, listAhItem, buyAhItem, cancelAhListing } = useMultiplayer();
  const char = gameState.character;

  const [tab, setTab] = useState<Tab>("browse");
  const [listStep, setListStep] = useState<ListStep>(null);
  const [pickedEntry, setPickedEntry] = useState<MaterialEntry | null>(null);
  const [countStr, setCountStr] = useState("1");
  const [priceStr, setPriceStr] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const myListings = listings.filter((l) => l.sellerId === yourId);
  const otherListings = listings.filter((l) => l.sellerId !== yourId);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  }, []);

  const handleBuy = useCallback((listing: AuctionListing) => {
    if (char.gold < listing.price) { showFeedback("Not enough gold!"); return; }
    applyGoldXp(-listing.price, 0);
    buyAhItem(listing.id);
    showFeedback(`Sent purchase — items incoming!`);
  }, [char.gold, buyAhItem, applyGoldXp, showFeedback]);

  const handleCancel = useCallback((listing: AuctionListing) => {
    cancelAhListing(listing.id);
    showFeedback("Cancellation sent…");
  }, [cancelAhListing, showFeedback]);

  const handlePickItem = (entry: MaterialEntry) => {
    setPickedEntry(entry);
    setCountStr("1");
    setPriceStr("");
    setListStep("price");
  };

  const handleConfirmList = () => {
    if (!pickedEntry) return;
    const count = Math.max(1, parseInt(countStr) || 1);
    const price = parseInt(priceStr) || 0;
    if (count > pickedEntry.count) { showFeedback("Not enough items!"); return; }
    if (price <= 0) { showFeedback("Set a price above 0."); return; }
    removeMaterial(pickedEntry.key, count);
    listAhItem(pickedEntry.material, count, price);
    setListStep(null);
    setPickedEntry(null);
    setTab("mine");
    showFeedback("Item listed!");
  };

  const renderBrowse = () => (
    <View style={styles.tabContent}>
      {otherListings.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No listings from other players.</Text>
          <Text style={styles.emptySubText}>Be the first to sell something!</Text>
        </View>
      ) : (
        <FlatList
          data={otherListings}
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
          contentContainerStyle={{ gap: 8 }}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        />
      )}
    </View>
  );

  const renderMine = () => (
    <View style={styles.tabContent}>
      <Pressable style={styles.listItemBtn} onPress={() => setListStep("pick")}>
        <Text style={styles.listItemBtnTxt}>+ LIST AN ITEM</Text>
      </Pressable>
      {myListings.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No active listings.</Text>
        </View>
      ) : (
        <FlatList
          data={myListings}
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
          contentContainerStyle={{ gap: 8 }}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        />
      )}
    </View>
  );

  const renderPickStep = () => (
    <View style={styles.listSheet}>
      <Text style={styles.listSheetTitle}>SELECT ITEM TO LIST</Text>
      {char.materials.length === 0 ? (
        <Text style={styles.emptyText}>No items in inventory.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
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
      <Pressable style={styles.cancelSheetBtn} onPress={() => setListStep(null)}>
        <Text style={styles.cancelSheetBtnTxt}>BACK</Text>
      </Pressable>
    </View>
  );

  const renderPriceStep = () => {
    if (!pickedEntry) return null;
    const maxCount = pickedEntry.count;
    return (
      <View style={styles.listSheet}>
        <Text style={styles.listSheetTitle}>SET LISTING DETAILS</Text>
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
              style={styles.pricePreviewName}
            />
            <Text style={styles.pricePreviewSub}>You have ×{maxCount}</Text>
          </View>
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Quantity</Text>
          <TextInput
            style={styles.priceInput}
            keyboardType="number-pad"
            value={countStr}
            onChangeText={setCountStr}
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
            keyboardType="number-pad"
            value={priceStr}
            onChangeText={setPriceStr}
            maxLength={8}
            placeholderTextColor={Colors.game.textMuted}
            placeholder="100"
            selectionColor={Colors.game.gold}
          />
        </View>
        <View style={styles.listBtnRow}>
          <Pressable style={styles.cancelSheetBtn} onPress={() => setListStep("pick")}>
            <Text style={styles.cancelSheetBtnTxt}>BACK</Text>
          </Pressable>
          <Pressable style={styles.confirmBtn} onPress={handleConfirmList}>
            <Text style={styles.confirmBtnTxt}>LIST FOR SALE</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>AUCTION HOUSE</Text>
            <View style={styles.goldPill}>
              <View style={styles.goldCoin}><Text style={styles.goldCoinTxt}>G</Text></View>
              <Text style={styles.goldAmt}>{char.gold.toLocaleString()}</Text>
            </View>
          </View>

          {feedback && (
            <View style={styles.feedbackBanner}>
              <Text style={styles.feedbackText}>{feedback}</Text>
            </View>
          )}

          <View style={styles.tabs}>
            <Pressable
              style={[styles.tabBtn, tab === "browse" && styles.tabBtnActive]}
              onPress={() => setTab("browse")}
            >
              <Text style={[styles.tabBtnTxt, tab === "browse" && styles.tabBtnTxtActive]}>
                BROWSE ({otherListings.length})
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

          {tab === "browse" ? renderBrowse() : renderMine()}

          {listStep === "pick" && renderPickStep()}
          {listStep === "price" && renderPriceStep()}

          <Pressable style={styles.closeBtn} onPress={onClose}>
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
    padding: 20,
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
    alignItems: "center", marginBottom: 14,
  },
  headerTitle: {
    fontSize: 14, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 3,
  },
  goldPill: { flexDirection: "row", alignItems: "center", gap: 6 },
  goldCoin: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.game.gold,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#a07820",
  },
  goldCoinTxt: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#3d2e00" },
  goldAmt: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  feedbackBanner: {
    backgroundColor: "rgba(34,197,94,0.12)", borderRadius: 8,
    padding: 8, marginBottom: 10, alignItems: "center",
    borderWidth: 1, borderColor: Colors.game.green,
  },
  feedbackText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.game.green },
  tabs: {
    flexDirection: "row", gap: 8, marginBottom: 14,
  },
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
  tabContent: { height: 280, marginBottom: 10 },
  emptyBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 6 },
  emptyText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.game.textDim },
  emptySubText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },
  listItemBtn: {
    backgroundColor: "rgba(201,168,76,0.1)", borderRadius: 12,
    paddingVertical: 11, alignItems: "center", marginBottom: 12,
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
  listSheet: {
    position: "absolute", bottom: 70, left: 0, right: 0,
    backgroundColor: Colors.game.surface, borderRadius: 20,
    padding: 16, borderWidth: 1, borderColor: Colors.game.border,
    maxHeight: 420, zIndex: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 10,
  },
  listSheetTitle: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 3, marginBottom: 12, textAlign: "center",
  },
  pickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  pickSlot: {
    width: 70, alignItems: "center", gap: 3,
    backgroundColor: Colors.game.surfaceAlt, borderRadius: 12,
    padding: 6, borderWidth: 2,
  },
  pickLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  pickCount: { fontSize: 9, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },
  pricePreview: {
    flexDirection: "row", gap: 12, alignItems: "center",
    backgroundColor: Colors.game.surfaceAlt, borderRadius: 12,
    padding: 10, marginBottom: 14,
  },
  pricePreviewName: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 2 },
  pricePreviewSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    color: Colors.game.textDim, width: 110,
  },
  priceInput: {
    flex: 1, backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.game.gold,
    borderWidth: 1, borderColor: Colors.game.border,
  },
  listBtnRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  cancelSheetBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 11,
    alignItems: "center", borderWidth: 1, borderColor: Colors.game.border,
  },
  cancelSheetBtnTxt: {
    fontSize: 12, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 1.5,
  },
  confirmBtn: {
    flex: 2, borderRadius: 12, paddingVertical: 11,
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
