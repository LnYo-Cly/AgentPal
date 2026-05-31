import { createBox, createRestyleComponent, createText, createTheme, spacing, SpacingProps } from "@shopify/restyle";
import { PressableProps } from "react-native";

export const theme = createTheme({
  colors: {
    canvas: "#F6F1E8",
    surface: "#FFFCF6",
    surfaceMuted: "#ECE3D4",
    ink: "#1F2A2E",
    inkMuted: "#657173",
    line: "#D8CFC0",
    accent: "#247C6D",
    accentSoft: "#DCEDE8",
    cobalt: "#315C9B",
    cobaltSoft: "#DFE8F7",
    amber: "#B96B1E",
    amberSoft: "#F5E2C7",
    danger: "#B94141",
    dangerSoft: "#F1DADA",
    success: "#2E7D45",
    successSoft: "#DCEBD8",
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
    s: 4,
    m: 8,
    l: 12,
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
