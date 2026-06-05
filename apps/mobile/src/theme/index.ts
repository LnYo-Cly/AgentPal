import { createBox, createRestyleComponent, createText, createTheme, spacing, SpacingProps } from "@shopify/restyle";
import { PressableProps } from "react-native";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedThemeMode = "light" | "dark";

const lightColors = {
  canvas: "#F6F9FF",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF4FB",
  navActive: "#E5F1FF",
  userBubble: "#DFF0FF",
  terminal: "#0F172A",
  terminalText: "#EAF2FF",
  ink: "#101828",
  inkMuted: "#667085",
  line: "#D9E4F2",
  accent: "#2F80ED",
  accentSoft: "#E3F1FF",
  cobalt: "#2563EB",
  cobaltSoft: "#E8F0FF",
  violet: "#7C3AED",
  violetSoft: "#F0E9FF",
  amber: "#D79A21",
  amberSoft: "#FFF6D8",
  danger: "#D92D54",
  dangerSoft: "#FFE7EE",
  success: "#12B76A",
  successSoft: "#E7F8F0",
  white: "#FFFFFF",
  transparent: "transparent"
};

const darkColors: typeof lightColors = {
  canvas: "#1B1B1D",
  surface: "#15151A",
  surfaceMuted: "#24252B",
  navActive: "#202A39",
  userBubble: "#14304A",
  terminal: "#090D14",
  terminalText: "#E7EDF6",
  ink: "#F4F7FB",
  inkMuted: "#9CA0AA",
  line: "#2C2D34",
  accent: "#2F8CFF",
  accentSoft: "#102A45",
  cobalt: "#5EA1FF",
  cobaltSoft: "#132941",
  violet: "#B58CFF",
  violetSoft: "#2B1D45",
  amber: "#E2A72E",
  amberSoft: "#382B12",
  danger: "#FF5D73",
  dangerSoft: "#3E1720",
  success: "#22D36E",
  successSoft: "#123525",
  white: "#FFFFFF",
  transparent: "transparent"
};

export const theme = createTheme({
  colors: { ...lightColors },
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
    m: 10,
    l: 16,
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

export function applyThemePalette(mode: ResolvedThemeMode): Theme {
  const colors = mode === "dark" ? darkColors : lightColors;
  Object.assign(theme.colors, colors);

  return {
    ...theme,
    colors: { ...theme.colors }
  };
}

export const Box = createBox<Theme>();
export const Text = createText<Theme>();

type PressableSpacingProps = SpacingProps<Theme> & PressableProps;

export const Touchable = createRestyleComponent<PressableSpacingProps, Theme>([spacing]);
