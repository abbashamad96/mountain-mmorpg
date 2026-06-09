import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";

interface RubyPack {
  productId: string;
  name: string;
  description: string;
  rubies: number;
  priceId: string;
  unitAmount: number;
  currency: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  username: string | null;
  onRequireLogin: () => void;
}

const BASE_URL = "/api";

function formatPrice(unitAmount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(unitAmount / 100);
}

function RubyPackCard({
  pack,
  onBuy,
  loading,
}: {
  pack: RubyPack;
  onBuy: (pack: RubyPack) => void;
  loading: boolean;
}) {
  const isPopular = pack.rubies === 500;
  const isBestValue = pack.rubies === 3000;

  return (
    <View style={[styles.card, isPopular && styles.cardPopular, isBestValue && styles.cardBest]}>
      {isPopular && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>POPULAR</Text>
        </View>
      )}
      {isBestValue && (
        <View style={[styles.badge, styles.badgeBest]}>
          <Text style={styles.badgeText}>BEST VALUE</Text>
        </View>
      )}
      <Text style={styles.rubyAmount}>◆ {pack.rubies.toLocaleString()}</Text>
      <Text style={styles.packName}>{pack.name}</Text>
      <Pressable
        style={({ pressed }) => [styles.buyBtn, pressed && styles.buyBtnPressed, loading && styles.buyBtnDisabled]}
        onPress={() => !loading && onBuy(pack)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buyBtnText}>{formatPrice(pack.unitAmount, pack.currency)}</Text>
        )}
      </Pressable>
    </View>
  );
}

export function RubyShopModal({ visible, onClose, username, onRequireLogin }: Props) {
  const [packs, setPacks] = useState<RubyPack[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPacks = useCallback(async () => {
    setLoadingPacks(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/stripe/products`);
      if (!res.ok) throw new Error("Failed to load shop");
      const data = await res.json();
      setPacks(data.products ?? []);
    } catch {
      setError("Could not load the shop. Please try again.");
    } finally {
      setLoadingPacks(false);
    }
  }, []);

  useEffect(() => {
    if (visible) fetchPacks();
  }, [visible, fetchPacks]);

  const handleBuy = useCallback(
    async (pack: RubyPack) => {
      if (!username) {
        onRequireLogin();
        return;
      }
      setBuyingId(pack.priceId);
      setError(null);
      try {
        const res = await fetch(`${BASE_URL}/stripe/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId: pack.priceId, username }),
        });
        const data = await res.json();
        if (data.url) {
          Linking.openURL(data.url);
          onClose();
        } else {
          setError(data.error ?? "Checkout failed. Try again.");
        }
      } catch {
        setError("Checkout failed. Please try again.");
      } finally {
        setBuyingId(null);
      }
    },
    [username, onRequireLogin, onClose],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>◆ Ruby Shop</Text>
              <Text style={styles.subtitle}>Purchase rubies to use in-game</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {!username && (
            <View style={styles.loginBanner}>
              <Text style={styles.loginBannerText}>
                You need to be logged in to purchase rubies.
              </Text>
              <Pressable style={styles.loginBannerBtn} onPress={() => { onClose(); onRequireLogin(); }}>
                <Text style={styles.loginBannerBtnText}>Log In / Register</Text>
              </Pressable>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {loadingPacks ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#E91E8C" />
              <Text style={styles.loadingText}>Loading shop…</Text>
            </View>
          ) : packs.length === 0 ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>No products available.</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.grid}>
                {packs.map((pack) => (
                  <RubyPackCard
                    key={pack.priceId}
                    pack={pack}
                    onBuy={handleBuy}
                    loading={buyingId === pack.priceId}
                  />
                ))}
              </View>
              <Text style={styles.disclaimer}>
                Payments processed securely by Stripe. Rubies are credited to your account after
                purchase. No refunds.
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.game.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#E91E8C44",
    maxHeight: "85%",
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.game.border,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#E91E8C",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: Colors.game.textDim,
  },
  loginBanner: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: "#1a1a2a",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.game.border,
    gap: 10,
  },
  loginBannerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    textAlign: "center",
  },
  loginBannerBtn: {
    backgroundColor: "#E91E8C22",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E91E8C88",
    alignSelf: "center",
  },
  loginBannerBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#E91E8C",
  },
  errorBox: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: "#2a1a1a",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.game.red + "66",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.game.red,
    textAlign: "center",
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 12 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  card: {
    width: "46%",
    minWidth: 140,
    backgroundColor: Colors.game.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.game.border,
    padding: 14,
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  cardPopular: {
    borderColor: "#E91E8C88",
    backgroundColor: "#1a0d18",
  },
  cardBest: {
    borderColor: Colors.game.gold + "88",
    backgroundColor: "#1a1500",
  },
  badge: {
    position: "absolute",
    top: -10,
    backgroundColor: "#E91E8C",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeBest: {
    backgroundColor: Colors.game.gold,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  rubyAmount: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#E91E8C",
    marginTop: 8,
  },
  packName: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
    textAlign: "center",
  },
  buyBtn: {
    backgroundColor: "#E91E8C",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    width: "100%",
    alignItems: "center",
    marginTop: 4,
  },
  buyBtnPressed: {
    backgroundColor: "#c0156f",
  },
  buyBtnDisabled: {
    backgroundColor: "#8B0050",
  },
  buyBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  disclaimer: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 15,
  },
});
