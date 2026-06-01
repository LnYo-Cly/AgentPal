import { createBox, createRestyleComponent, createText, createTheme, spacing, SpacingProps } from "@shopify/restyle";
import { PressableProps } from "react-native";

export const theme = createTheme({
  colors: {
    canvas: "#F6F3EE",
    surface: "#FFFFFF",
    surfaceMuted: "#EFEDE8",
    navActive: "#E7EEF0",
    userBubble: "#E8F4FA",
    terminal: "#20242C",
    terminalText: "#EEF3F8",
    ink: "#191B20",
    inkMuted: "#70747E",
    line: "#E3E0DA",
    accent: "#5EA1C8",
    accentSoft: "#E2F2FA",
    cobalt: "#4B7BD8",
    cobaltSoft: "#E4ECFF",
    violet: "#8A6BE8",
    violetSoft: "#EEE9FF",
    amber: "#D8992E",
    amberSoft: "#FFF0D1",
    danger: "#D94C5C",
    dangerSoft: "#FDE7EA",
    success: "#55B772",
    successSoft: "#E5F6EA",
    white: "#FFFFFF"
  },
  spacing: {
    none: 0,
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
    xxl: 32
  },
  borderRadii: {
    none: 0,
    s: 6,
    m: 12,
    l: 20,
    round: 999
  },
  textVariants: {
    defaults: {
      color: "ink",
      fontSize: 16,
      lineHeight: 24
    },
    screenTitle: {
      color: "ink",
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "700"
    },
    title: {
      color: "ink",
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "700"
    },
    section: {
      color: "ink",
      fontSize: 17,
      lineHeight: 23,
      fontWeight: "700"
    },
    body: {
      color: "ink",
      fontSize: 16,
      lineHeight: 24
    },
    caption: {
      color: "inkMuted",
      fontSize: 13,
      lineHeight: 18
    },
    label: {
      color: "inkMuted",
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "700",
      textTransform: "uppercase"
    }
  }
});

export type Theme = typeof theme;
export const Box = createBox<Theme>();
export const Text = createText<Theme>();

type PressableSpacingProps = SpacingProps<Theme> & PressableProps;

export const Touchable = createRestyleComponent<PressableSpacingProps, Theme>([spacing]);
