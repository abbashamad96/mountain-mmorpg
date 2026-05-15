import { Feather } from "@expo/vector-icons";
import React, { useCallback } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import {
  NotificationEntry,
  useMultiplayer,
} from "@/context/MultiplayerContext";

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

function NotificationRow({
  item,
  isLast,
}: {
  item: NotificationEntry;
  isLast: boolean;
}) {
  const iconInfo = (() => {
    switch (item.kind) {
      case "sale":
        return { name: "dollar-sign" as const, color: Colors.game.gold };
      case "bought":
        return { name: "shopping-bag" as const, color: Colors.game.blue };
      case "cancelled":
        return { name: "x-circle" as const, color: Colors.game.textMuted };
      case "bo_sold":
        return { name: "dollar-sign" as const, color: Colors.game.gold };
      case "bo_received":
        return { name: "package" as const, color: Colors.game.blue };
      case "bo_cancelled":
        return { name: "rotate-ccw" as const, color: Colors.game.textMuted };
    }
  })();

  const timeStr = new Date(item.ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = new Date(item.ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return (
    <View
      style={[
        styles.row,
        !item.read && styles.rowUnread,
        isLast && { borderBottomWidth: 0 },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconInfo.color + "18" }]}>
        <Feather name={iconInfo.name} size={16} color={iconInfo.color} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.title, !item.read && styles.titleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.time}>
          {dateStr} · {timeStr}
        </Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </View>
  );
}

export function NotificationsModal({ visible, onClose }: NotificationsModalProps) {
  const { notifications, unreadCount, markNotificationsRead } = useMultiplayer();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 12 : insets.bottom;

  const handleMarkAll = useCallback(() => {
    markNotificationsRead();
  }, [markNotificationsRead]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.root, { paddingTop: Platform.OS === "web" ? 0 : insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            {unreadCount > 0 && (
              <Pressable onPress={handleMarkAll} hitSlop={8} style={styles.markAllBtn}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </Pressable>
            )}
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Feather name="x" size={22} color={Colors.game.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* List */}
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="bell" size={36} color={Colors.game.border} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>
              Auction sales, buy orders, and refunds will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: bottomPad + 16 }}
            renderItem={({ item, index }) => (
              <NotificationRow item={item} isLast={index === notifications.length - 1} />
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.game.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.game.text },
  badge: {
    backgroundColor: Colors.game.red,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  markAllBtn: {
    backgroundColor: Colors.game.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  markAllText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.game.textMuted },
  closeBtn: { padding: 4 },
  divider: { height: 1, backgroundColor: Colors.game.border, marginHorizontal: 16 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.game.textMuted },
  emptySub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    textAlign: "center",
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.game.border,
  },
  rowUnread: {
    backgroundColor: "rgba(34,197,94,0.04)",
    borderLeftWidth: 3,
    borderLeftColor: Colors.game.green,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  rowBody: { flex: 1, gap: 3 },
  title: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.game.text },
  titleUnread: { color: Colors.game.text, fontFamily: "Inter_700Bold" },
  body: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.game.textDim, lineHeight: 17 },
  time: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.game.textMuted, marginTop: 2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.game.green,
    marginTop: 6,
  },
});
