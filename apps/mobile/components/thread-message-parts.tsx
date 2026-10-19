import { ChatMarkdown } from "@rakazo/chat-ui/native";
import { isSecretAskBlock } from "@rakazo/core";
import { useMemo, useState } from "react";
import type { TextProps } from "react-native";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MobileMessage } from "../lib/api";
import { blockText } from "../lib/api";
import { mobileTokens } from "../lib/appearance";
import { plainAskTitle } from "../lib/ask-title";
import { t, useI18n } from "../lib/i18n";
import { quotableMessageSegments, truncateQuoteExcerpt } from "../lib/message-presentation";
import { useMobileTokens, useResolvedAppearance } from "../lib/native";
import { secretDestinationLabel } from "../lib/secret-destination";
import { errorText } from "../lib/user-error";
import { MessageCaption } from "./message-caption";
import { NativeActionButton } from "./native-action-button";
import { NativeSymbol } from "./native-symbol";

export type MessageActionProps = Pick<
  TextProps,
  "onLongPress" | "accessibilityActions" | "onAccessibilityAction"
>;

export function QuoteSheet({
  message,
  onCancel,
  onQuote,
}: {
  message: MobileMessage;
  onCancel: () => void;
  onQuote: (excerpt: string) => void;
}) {
  const tokens = useMobileTokens();
  const insets = useSafeAreaInsets();
  const segments = useMemo(() => quotableMessageSegments(message.role, message.blocks), [message]);
  const [selection, setSelection] = useState<{
    segment: number;
    start: number;
    end: number;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const selectedText = selection === null ? undefined : segments[selection.segment];
  const start = selection ? Math.min(selection.start, selection.end) : 0;
  const end = selection ? Math.max(selection.start, selection.end) : 0;
  const excerpt =
    selectedText === undefined ? "" : truncateQuoteExcerpt(selectedText.slice(start, end).trim());

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View
        accessibilityViewIsModal
        style={{
          flex: 1,
          backgroundColor: tokens.background,
          // Page sheets clear the notch on iOS; Android modals are full-screen.
          paddingTop: Platform.OS === "ios" ? 12 : insets.top + 12,
          paddingBottom: insets.bottom,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: 12,
          }}
        >
          <NativeActionButton label={t("Cancel")} onPress={onCancel} prominence="plain" />
          <NativeActionButton
            disabled={!excerpt}
            fill={false}
            label={t("Quote")}
            onPress={() => onQuote(excerpt)}
            prominence={excerpt ? "primary" : "plain"}
          />
        </View>
        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
          {segments.map((text, index) => (
            <TextInput
              key={`${index}:${revision}`}
              multiline
              scrollEnabled={false}
              showSoftInputOnFocus={false}
              value={text}
              // Any edit (paste, hardware keyboard, dictation) remounts the
              // field with the source text — the excerpt slices the original,
              // so the displayed text must never diverge from it.
              onChangeText={() => setRevision((value) => value + 1)}
              style={{
                color: tokens.foreground,
                fontSize: 15.5,
                lineHeight: 23,
                padding: 0,
                marginTop: index === 0 ? 0 : 12,
                textAlignVertical: "top",
              }}
              onSelectionChange={(event) => {
                const range = event.nativeEvent.selection;
                // A collapsed caret (tap, focus change, the Quote press
                // itself) keeps the last real span armed.
                if (range.start === range.end) return;
                setSelection({ segment: index, ...range });
              }}
            />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function MessageTextCard({
  message,
  speaker,
  speakerColor,
  actionProps,
}: {
  message: MobileMessage;
  speaker?: string;
  speakerColor?: string;
  actionProps: MessageActionProps;
}) {
  const colorScheme = useResolvedAppearance();
  const tokens = mobileTokens();
  const contentText = blockText(message);
  if (!contentText) return null;
  return (
    <Pressable
      {...actionProps}
      style={{
        flexShrink: 1,
        minWidth: 0,
        maxWidth: "100%",
        backgroundColor: message.role === "user" ? tokens.secondary : tokens.muted,
        padding: 12,
        borderRadius: 20,
      }}
    >
      {speaker ? (
        <Text
          style={{
            color: speakerColor ?? tokens.mutedForeground,
            fontSize: 12.5,
            fontWeight: "600",
            marginBottom: 4,
          }}
        >
          {speaker}
        </Text>
      ) : null}
      <MessageCaption
        role={message.role}
        text={contentText}
        tokens={tokens}
        colorScheme={colorScheme}
        streaming={message.id.startsWith("progress:")}
      />
    </Pressable>
  );
}

export function AgentEventLabel({
  label,
  detail,
  expanded,
  onToggle,
  actionProps,
}: {
  label: string;
  detail?: string;
  expanded: boolean;
  onToggle: () => void;
  actionProps: MessageActionProps;
}) {
  const colorScheme = useResolvedAppearance();
  const tokens = mobileTokens();
  const { t } = useI18n();
  return (
    <Pressable
      {...actionProps}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={expanded ? t("Hide {label}", { label }) : t("Show {label}", { label })}
      style={{ width: "100%", paddingVertical: 4, alignItems: "center" }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <NativeSymbol
          ios="arrow.left.arrow.right"
          android="swap-horizontal"
          size={12}
          color={tokens.mutedForeground}
        />
        <Text style={{ color: tokens.mutedForeground, fontSize: 13.5, textAlign: "center" }}>
          {label}
        </Text>
      </View>
      {expanded && detail ? (
        <View
          style={{
            width: "100%",
            marginTop: 6,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: tokens.border,
            backgroundColor: tokens.card,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <ChatMarkdown palette={tokens} colorScheme={colorScheme}>
            {detail}
          </ChatMarkdown>
        </View>
      ) : null}
    </Pressable>
  );
}

export function AskBlock({
  ask,
  canAnswer,
  onAnswer,
  actionProps,
}: {
  ask: Extract<MobileMessage["blocks"][number], { kind: "ask" }>;
  canAnswer: boolean;
  onAnswer: (answer: string, username?: string) => Promise<void>;
  actionProps: MessageActionProps;
}) {
  const tokens = useMobileTokens();
  const { t } = useI18n();
  const [answer, setAnswer] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const answered = ask.status === "answered";
  const secretInput = isSecretAskBlock(ask);
  const loginInput = secretInput && ask.credential?.auth.type === "login";
  const incomplete =
    (secretInput ? answer.length === 0 : !answer.trim()) || (loginInput && !username.trim());
  const secretLabel =
    loginInput || ask.purpose === "password"
      ? t("Password")
      : ask.purpose === "api_key"
        ? t("API key")
        : t("Code");
  const submitLabel = secretInput ? t("Save") : t("Send answer");

  async function submit() {
    if (submitting) return;
    if (incomplete) return;
    const submitValue = secretInput ? answer : answer.trim();
    const submitUsername = loginInput ? username.trim() : undefined;
    setSubmitting(true);
    setError(null);
    if (secretInput) setAnswer("");
    try {
      await onAnswer(submitValue, submitUsername);
    } catch (cause) {
      setError(
        secretInput ? t("Could not send answer") : errorText(cause, t("Could not send answer")),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View
      style={{
        width: "90%",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: tokens.border,
        backgroundColor: tokens.card,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
      }}
    >
      <Text
        {...actionProps}
        style={{ color: tokens.foreground, fontSize: 15.5, fontWeight: "600" }}
      >
        {plainAskTitle(ask.text)}
      </Text>
      {secretInput && ask.credential ? (
        <Text style={{ color: tokens.mutedForeground, fontSize: 13.5 }}>
          {secretDestinationLabel(ask.credential)}
        </Text>
      ) : null}
      {ask.detail && !secretInput ? (
        <Text style={{ color: tokens.mutedForeground, fontSize: 13.5 }}>{ask.detail}</Text>
      ) : null}
      {answered ? (
        <Text style={{ color: tokens.success, fontSize: 14 }}>
          {secretInput ? t("Saved") : t("Answered: {answer}", { answer: ask.answer ?? t("Done") })}
        </Text>
      ) : canAnswer ? (
        <>
          {loginInput ? (
            <TextInput
              accessibilityLabel={t("Username")}
              value={username}
              onChangeText={setUsername}
              placeholder={t("Username")}
              placeholderTextColor={tokens.mutedForeground}
              autoComplete="off"
              autoCorrect={false}
              autoCapitalize="none"
              editable={!submitting}
              style={[
                askInputStyles.field,
                { borderColor: tokens.border, color: tokens.foreground },
              ]}
            />
          ) : null}
          <TextInput
            accessibilityLabel={secretInput ? secretLabel : t("Answer")}
            value={answer}
            onChangeText={setAnswer}
            placeholder={secretInput ? secretLabel : t("Type your answer")}
            placeholderTextColor={tokens.mutedForeground}
            secureTextEntry={secretInput}
            autoComplete="off"
            autoCorrect={secretInput ? false : undefined}
            autoCapitalize={secretInput ? "none" : "sentences"}
            editable={!submitting}
            onSubmitEditing={() => void submit()}
            style={[askInputStyles.field, { borderColor: tokens.border, color: tokens.foreground }]}
          />
          <NativeActionButton
            label={submitLabel}
            disabled={incomplete}
            busy={submitting}
            fill={false}
            onPress={() => void submit()}
            style={{ alignSelf: "flex-end" }}
          />
        </>
      ) : (
        <Text style={{ color: tokens.mutedForeground, fontSize: 13.5 }}>
          {t("Waiting for this bot’s response.")}
        </Text>
      )}
      {error ? <Text style={{ color: tokens.destructive, fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}

const askInputStyles = StyleSheet.create({
  field: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
});
