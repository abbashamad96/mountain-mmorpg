import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BannerLabel, FantasyButton } from "@/components/ui";
import { ChatMessage, useMultiplayer } from "@/context/MultiplayerContext";

function MessageBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  const time = new Date(msg.ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={[styles.bubbleRow, isOwn && styles.bubbleRowOwn]}>
      {!isOwn && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {msg.senderName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      {isOwn ? (
        <LinearGradient
          colors={Colors.grad.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.bubble, styles.bubbleOwn]}
        >
          <Text style={[styles.bubbleText, styles.bubbleTextOwn]}>{msg.text}</Text>
          <Text style={[styles.timeText, styles.timeTextOwn]}>{time}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleOther]}>
          <Text style={styles.senderName}>{msg.senderName}</Text>
          <Text style={styles.bubbleText}>{msg.text}</Text>
          <Text style={styles.timeText}>{time}</Text>
        </View>
      )}
    </View>
  );
}

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ChatModal({ visible, onClose }: ChatModalProps) {
  const { status, yourId, playerName, messages, sendChat } = useMultiplayer();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 12 : insets.bottom;

  const [draft, setDraft] = React.useState("");
  const inputRef = useRef<TextInput>(null);

  const chatMessages = messages.filter((m) => m.type === "chat").slice(-40);

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    sendChat(text);
    setDraft("");
  }, [draft, sendChat]);

  const statusColor =
    status === "connected"
      ? Colors.game.green
      : status === "connecting"
        ? Colors.game.gold
        : Colors.game.red;

  const statusLabel =
    status === "connected" ? "Online" : status === "connecting" ? "Connecting..." : "Offline";

  const canSend = !!draft.trim() && status === "connected";

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <LinearGradient
        colors={Colors.grad.panel}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.root, { paddingTop: Platform.OS === "web" ? 0 : insets.top }]}
      >
        {/* Header */}
        <LinearGradient
          colors={Colors.grad.panelHi}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <BannerLabel title={playerName} icon="chatbubbles" size="sm" align="left" />
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          <FantasyButton
            icon="close"
            variant="dark"
            size="sm"
            onPress={onClose}
            style={styles.closeBtn}
          />
        </LinearGradient>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <FlatList
            data={[...chatMessages].reverse()}
            inverted
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble msg={item} isOwn={item.senderId === yourId} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Feather name="message-circle" size={40} color={Colors.game.textMuted} />
                <Text style={styles.emptyText}>
                  {status === "connecting"
                    ? "Connecting to the mountain road..."
                    : "No messages yet. Say something!"}
                </Text>
              </View>
            }
          />

          <View style={[styles.inputRow, { paddingBottom: bottomPad > 0 ? bottomPad : 12 }]}>
            <TextInput
              ref={inputRef}
              style={styles.chatInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="Say something..."
              placeholderTextColor={Colors.game.textMuted}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              maxLength={300}
              multiline={false}
              editable={status === "connected"}
            />
            <FantasyButton
              icon="send"
              variant="gold"
              size="md"
              onPress={handleSend}
              disabled={!canSend}
              style={styles.sendBtn}
            />
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.game.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.game.gold + "55",
  },
  headerLeft: {
    flex: 1,
    gap: 6,
    alignItems: "flex-start",
  },
  playerNameText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.game.text,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingLeft: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  closeBtn: {
    flexShrink: 0,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 4,
    gap: 8,
  },
  bubbleRowOwn: {
    flexDirection: "row-reverse",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.game.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.game.gold + "55",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
  },
  bubble: {
    maxWidth: "72%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleOther: {
    backgroundColor: Colors.game.surface,
    borderWidth: 1,
    borderColor: Colors.game.gold + "22",
    borderBottomLeftRadius: 4,
  },
  bubbleOwn: {
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: Colors.game.goldBright,
  },
  senderName: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.game.gold,
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.game.text,
    lineHeight: 20,
  },
  bubbleTextOwn: {
    color: "#3A2A0A",
  },
  timeText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted,
    marginTop: 3,
    alignSelf: "flex-end",
  },
  timeTextOwn: {
    color: "rgba(58,42,10,0.6)",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 60,
    transform: [{ scaleY: -1 }],
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted,
    textAlign: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.game.gold + "33",
    backgroundColor: Colors.game.backgroundDeep,
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.game.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.game.text,
    borderWidth: 1,
    borderColor: Colors.game.gold + "44",
    maxHeight: 100,
  },
  sendBtn: {
    flexShrink: 0,
  },
});
