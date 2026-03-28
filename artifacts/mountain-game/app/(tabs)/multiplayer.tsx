import { Feather } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { ChatMessage, useMultiplayer } from "@/context/MultiplayerContext";

function MessageBubble({
  msg,
  isOwn,
}: {
  msg: ChatMessage;
  isOwn: boolean;
}) {
  if (msg.type === "system") {
    return (
      <View style={styles.systemRow}>
        <Text style={styles.systemText}>{msg.text}</Text>
      </View>
    );
  }

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
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {!isOwn && (
          <Text style={styles.senderName}>{msg.senderName}</Text>
        )}
        <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
          {msg.text}
        </Text>
        <Text style={[styles.timeText, isOwn && styles.timeTextOwn]}>
          {time}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { status, yourId, playerName, setPlayerName, messages, sendChat } =
    useMultiplayer();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [draft, setDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(playerName);
  const inputRef = useRef<TextInput>(null);

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    sendChat(text);
    setDraft("");
  }, [draft, sendChat]);

  const handleSaveName = useCallback(() => {
    const n = nameInput.trim();
    if (n) setPlayerName(n);
    setEditingName(false);
  }, [nameInput, setPlayerName]);

  const statusColor =
    status === "connected"
      ? Colors.game.green
      : status === "connecting"
        ? Colors.game.gold
        : Colors.game.red;

  const statusLabel =
    status === "connected"
      ? "Online"
      : status === "connecting"
        ? "Connecting..."
        : "Offline";

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        {editingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
              placeholderTextColor={Colors.game.textMuted}
            />
            <Pressable style={styles.nameSaveBtn} onPress={handleSaveName}>
              <Feather name="check" size={18} color={Colors.game.background} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.nameRow}
            onPress={() => {
              setNameInput(playerName);
              setEditingName(true);
            }}
          >
            <Text style={styles.playerNameText}>{playerName}</Text>
            <Feather name="edit-2" size={13} color={Colors.game.textMuted} style={{ marginLeft: 6 }} />
          </Pressable>
        )}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={[...messages].reverse()}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble msg={item} isOwn={item.senderId === yourId} />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 8 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Feather
                name="message-circle"
                size={40}
                color={Colors.game.textMuted}
              />
              <Text style={styles.emptyText}>
                {status === "connecting"
                  ? "Connecting to the mountain road..."
                  : "No messages yet. Say something!"}
              </Text>
            </View>
          }
        />

        <View
          style={[
            styles.inputRow,
            { paddingBottom: bottomPad > 0 ? bottomPad : 12 },
          ]}
        >
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
          <Pressable
            style={[
              styles.sendBtn,
              (!draft.trim() || status !== "connected") && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!draft.trim() || status !== "connected"}
          >
            <Feather
              name="send"
              size={18}
              color={
                draft.trim() && status === "connected"
                  ? Colors.game.background
                  : Colors.game.textMuted
              }
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
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
    paddingVertical: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  playerNameText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.game.text,
  },
  nameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  nameInput: {
    flex: 1,
    backgroundColor: Colors.game.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.game.text,
    borderWidth: 1,
    borderColor: Colors.game.gold,
  },
  nameSaveBtn: {
    backgroundColor: Colors.game.gold,
    borderRadius: 8,
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.game.border,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  systemRow: {
    alignItems: "center",
    paddingVertical: 8,
  },
  systemText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted,
    fontStyle: "italic",
    textAlign: "center",
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
    borderColor: Colors.game.border,
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
    borderColor: Colors.game.border,
    borderBottomLeftRadius: 4,
  },
  bubbleOwn: {
    backgroundColor: Colors.game.gold,
    borderBottomRightRadius: 4,
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
    color: Colors.game.background,
  },
  timeText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted,
    marginTop: 3,
    alignSelf: "flex-end",
  },
  timeTextOwn: {
    color: "rgba(13,10,20,0.5)",
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
    borderTopColor: Colors.game.border,
    backgroundColor: Colors.game.background,
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
    borderColor: Colors.game.border,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.game.gold,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.game.surface,
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
});
