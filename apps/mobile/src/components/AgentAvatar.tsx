import { Bot } from "lucide-react-native";

import { Box, Text, theme } from "@/theme";

type Props = {
  status: "running" | "approval" | "complete";
  agent: string;
};

const statusTone = {
  running: { bg: "cobaltSoft", fg: "cobalt", label: "运行中" },
  approval: { bg: "amberSoft", fg: "amber", label: "待审批" },
  complete: { bg: "successSoft", fg: "success", label: "完成" }
} as const;

export function AgentAvatar({ status, agent }: Props) {
  const tone = statusTone[status];

  return (
    <Box alignItems="center" gap="s">
      <Box
        width={72}
        height={72}
        borderRadius="l"
        backgroundColor={tone.bg}
        alignItems="center"
        justifyContent="center"
        borderWidth={1}
        borderColor="line"
      >
        <Bot color={theme.colors[tone.fg]} size={34} strokeWidth={2.2} />
      </Box>
      <Box alignItems="center">
        <Text variant="caption">{agent}</Text>
        <Text variant="label" color={tone.fg}>
          {tone.label}
        </Text>
      </Box>
    </Box>
  );
}
