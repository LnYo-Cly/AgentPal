import { ChevronRight, FileDiff, ShieldCheck } from "lucide-react-native";

import { Session } from "@/data/sample";
import { Box, Text, theme } from "@/theme";

import { AgentAvatar } from "./AgentAvatar";
import { Card } from "./Card";

type Props = {
  session: Session;
};

export function SessionCard({ session }: Props) {
  return (
    <Card>
      <Box flexDirection="row" gap="l" alignItems="center">
        <AgentAvatar status={session.status} agent={session.agent} />
        <Box flex={1} gap="s">
          <Box flexDirection="row" alignItems="center" gap="s">
            <Text variant="title" flex={1} numberOfLines={2}>
              {session.title}
            </Text>
            <ChevronRight color={theme.colors.inkMuted} size={22} />
          </Box>
          <Text variant="caption" numberOfLines={1}>
            {session.workspace}
          </Text>
          <Text variant="body" color="inkMuted">
            {session.summary}
          </Text>
          <Box flexDirection="row" gap="s" marginTop="xs">
            <Box
              minHeight={36}
              borderRadius="m"
              backgroundColor="cobaltSoft"
              paddingHorizontal="m"
              flexDirection="row"
              alignItems="center"
              gap="xs"
            >
              <FileDiff color={theme.colors.cobalt} size={16} />
              <Text variant="caption" color="cobalt">
                {session.changedFiles} files
              </Text>
            </Box>
            <Box
              minHeight={36}
              borderRadius="m"
              backgroundColor={session.approvals > 0 ? "amberSoft" : "successSoft"}
              paddingHorizontal="m"
              flexDirection="row"
              alignItems="center"
              gap="xs"
            >
              <ShieldCheck color={session.approvals > 0 ? theme.colors.amber : theme.colors.success} size={16} />
              <Text variant="caption" color={session.approvals > 0 ? "amber" : "success"}>
                {session.approvals} approvals
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Card>
  );
}
