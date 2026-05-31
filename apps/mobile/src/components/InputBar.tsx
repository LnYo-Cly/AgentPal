import { Mic, Send, WandSparkles } from "lucide-react-native";
import { useState } from "react";
import { Pressable, TextInput } from "react-native";

import { Box, Text, theme } from "@/theme";

type Props = {
  disabled?: boolean;
  onSubmit?: (text: string) => boolean;
};

export function InputBar({ disabled = false, onSubmit }: Props) {
  const [text, setText] = useState("");
  const canSubmit = text.trim().length > 0 && !disabled;

  const submit = () => {
    if (!canSubmit) {
      return;
    }
    if (onSubmit?.(text)) {
      setText("");
    }
  };

  return (
    <Box
      minHeight={64}
      backgroundColor="surface"
      borderRadius="m"
      borderWidth={1}
      borderColor="line"
      padding="s"
      flexDirection="row"
      alignItems="center"
      gap="s"
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Open command picker">
        <Box width={44} height={44} borderRadius="m" backgroundColor="accentSoft" alignItems="center" justifyContent="center">
          <WandSparkles color={theme.colors.accent} size={21} />
        </Box>
      </Pressable>
      <Box flex={1} minHeight={44} justifyContent="center">
        <TextInput
          value={text}
          onChangeText={setText}
          editable={!disabled}
          placeholder={disabled ? "等待 Host 连接..." : "继续指挥这个 Agent..."}
          placeholderTextColor={theme.colors.inkMuted}
          multiline
          style={{
            color: theme.colors.ink,
            fontSize: 16,
            lineHeight: 22,
            minHeight: 44,
            paddingVertical: 10
          }}
          onSubmitEditing={submit}
        />
      </Box>
      <Pressable accessibilityRole="button" accessibilityLabel="Start voice input">
        <Box width={44} height={44} borderRadius="m" backgroundColor="surfaceMuted" alignItems="center" justifyContent="center">
          <Mic color={theme.colors.inkMuted} size={21} />
        </Box>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Send instruction" disabled={!canSubmit} onPress={submit}>
        <Box
          width={44}
          height={44}
          borderRadius="m"
          backgroundColor={canSubmit ? "accent" : "surfaceMuted"}
          alignItems="center"
          justifyContent="center"
        >
          <Send color={canSubmit ? theme.colors.white : theme.colors.inkMuted} size={20} />
        </Box>
      </Pressable>
    </Box>
  );
}
