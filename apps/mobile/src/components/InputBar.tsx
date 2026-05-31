import { Mic, Send, WandSparkles } from "lucide-react-native";
import { Pressable } from "react-native";

import { Box, Text, theme } from "@/theme";

export function InputBar() {
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
        <Text variant="body" color="inkMuted">
          继续指挥这个 Agent...
        </Text>
      </Box>
      <Pressable accessibilityRole="button" accessibilityLabel="Start voice input">
        <Box width={44} height={44} borderRadius="m" backgroundColor="surfaceMuted" alignItems="center" justifyContent="center">
          <Mic color={theme.colors.inkMuted} size={21} />
        </Box>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Send instruction">
        <Box width={44} height={44} borderRadius="m" backgroundColor="accent" alignItems="center" justifyContent="center">
          <Send color={theme.colors.white} size={20} />
        </Box>
      </Pressable>
    </Box>
  );
}
