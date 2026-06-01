import { createBox, createRestyleComponent, createText, createTheme, spacing, SpacingProps } from "@shopify/restyle";
import { PressableProps } from "react-native";

export const theme = createTheme({
  colors: {
    canvas: "#EAF5FF",
    surface: "#FFFFFF",
    surfaceMuted: "#F3F8FF",
    ink: "#15213A",
    inkMuted: "#5F6D82",
    line: "#D7E3F2",
    accent: "#3F75E8",
    accentSoft: "#E3EEFF",
    cobalt: "#3F75E8",
    cobaltSoft: "#DCE9FF",
    amber: "#F08A2B",
    amberSoft: "#FFE6C7",
    danger: "#E35D6A",
    dangerSoft: "#FCE4E7",
    success: "#46B26B",
    successSoft: "#DDF4E6",
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
