import { FeedItem } from "@/data/sample";
import { Box, Text, theme } from "@/theme";

type Props = {
  item: FeedItem;
};

const toneColor = {
  neutral: "surfaceMuted",
  blue: "cobaltSoft",
  amber: "amberSoft",
  green: "successSoft"
} as const;

const iconColor = {
  neutral: "inkMuted",
  blue: "cobalt",
  amber: "amber",
  green: "success"
} as const;

export function EventCard({ item }: Props) {
  const Icon = item.icon;

  return (
    <Box
      backgroundColor="surface"
      borderRadius="m"
      borderWidth={1}
      borderColor="line"
      padding="m"
      flexDirection="row"
      gap="m"
      minHeight={112}
    >
      <Box
        width={44}
        height={44}
        borderRadius="m"
        backgroundColor={toneColor[item.tone]}
        alignItems="center"
        justifyContent="center"
      >
        <Icon color={theme.colors[iconColor[item.tone]]} size={22} />
      </Box>
      <Box flex={1} gap="xs">
        <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="m">
          <Text variant="section" numberOfLines={1} flex={1}>
            {item.title}
          </Text>
          <Text variant="caption">{item.meta}</Text>
        </Box>
        <Text variant="body" color="inkMuted">
          {item.body}
        </Text>
      </Box>
    </Box>
  );
}
