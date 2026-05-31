import { FlashList } from "@shopify/flash-list";
import { ThemeProvider } from "@shopify/restyle";
import { Wifi } from "lucide-react-native";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/Card";
import { EventCard } from "@/components/EventCard";
import { InputBar } from "@/components/InputBar";
import { SessionCard } from "@/components/SessionCard";
import { feed, quickStats, sessions } from "@/data/sample";
import { Box, Text, theme } from "@/theme";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const active = sessions[0];

  return (
    <ThemeProvider theme={theme}>
      <Box flex={1} backgroundColor="canvas" paddingTop="l">
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top,
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 20,
            gap: 16
          }}
        >
          <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="m">
            <Box flex={1}>
              <Text variant="label">AgentPal</Text>
              <Text variant="screenTitle">口袋工作台</Text>
            </Box>
            <Box
              minHeight={44}
              borderRadius="m"
              backgroundColor="successSoft"
              paddingHorizontal="m"
              flexDirection="row"
              alignItems="center"
              gap="s"
            >
              <Wifi color={theme.colors.success} size={18} />
              <Text variant="caption" color="success">
                Host online
              </Text>
            </Box>
          </Box>

          <Box flexDirection="row" gap="s">
            {quickStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Box
                  key={stat.label}
                  flex={1}
                  minHeight={86}
                  backgroundColor="surface"
                  borderRadius="m"
                  borderWidth={1}
                  borderColor="line"
                  padding="m"
                  justifyContent="space-between"
                >
                  <Icon color={theme.colors.accent} size={20} />
                  <Box>
                    <Text variant="title">{stat.value}</Text>
                    <Text variant="caption">{stat.label}</Text>
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Box gap="s">
            <Text variant="section">当前会话</Text>
            <SessionCard session={active} />
          </Box>

          <Card muted>
            <Box gap="s">
              <Text variant="section">快捷入口</Text>
              <Box flexDirection="row" gap="s">
                {["连接主机", "查看审批", "打开 Diff"].map((label) => (
                  <Box
                    key={label}
                    flex={1}
                    minHeight={44}
                    alignItems="center"
                    justifyContent="center"
                    backgroundColor="surface"
                    borderRadius="m"
                    borderWidth={1}
                    borderColor="line"
                    paddingHorizontal="s"
                  >
                    <Text variant="caption" color="ink">
                      {label}
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          </Card>

          <Box gap="s">
            <Text variant="section">会话流</Text>
            <Box height={feed.length * 124}>
              <FlashList
                data={feed}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <Box height={8} />}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <EventCard item={item} />}
              />
            </Box>
          </Box>

          <InputBar />
        </ScrollView>
      </Box>
    </ThemeProvider>
  );
}
