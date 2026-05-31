import { PropsWithChildren } from "react";

import { Box } from "@/theme";

type Props = PropsWithChildren<{
  muted?: boolean;
}>;

export function Card({ children, muted = false }: Props) {
  return (
    <Box
      backgroundColor={muted ? "surfaceMuted" : "surface"}
      borderColor="line"
      borderRadius="m"
      borderWidth={1}
      padding="l"
      elevation={1}
    >
      {children}
    </Box>
  );
}
