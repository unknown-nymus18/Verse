import { useThemeProvider } from "@/components/ThemeProvider";
import { BlurTint, BlurView, BlurViewProps } from "expo-blur";
import { forwardRef, PropsWithChildren } from "react";
import { Platform, StyleSheet, View, ViewProps, ViewStyle } from "react-native";

export interface AppBlurViewProps extends PropsWithChildren<ViewProps> {
  intensity?: number;
  tint?: BlurTint;
  blurTarget?: BlurViewProps["blurTarget"];
  blurMethod?: BlurViewProps["blurMethod"];
  blurReductionFactor?: number;
  overlayAlpha?: number;
  overlayColor?: string;
  style?: ViewStyle | ViewStyle[];
}

function hexToRgba(color: string, alpha: number): string {
  if (!color) return `rgba(0, 0, 0, ${alpha})`;
  if (color.startsWith("rgba")) {
    return color.replace(/[\d\.]+\)$/g, `${alpha})`);
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }
  const hex = color.replace("#", "");
  const fullHex =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const num = parseInt(fullHex, 16);
  if (isNaN(num)) return color;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const AppBlurView = forwardRef<View, AppBlurViewProps>(function AppBlurView(
  {
    children,
    style,
    intensity = 45,
    tint,
    blurTarget,
    blurMethod,
    blurReductionFactor = 4,
    overlayAlpha,
    overlayColor,
    ...rest
  },
  ref,
) {
  const { colors, isDark } = useThemeProvider();
  const themeBg = colors.bgColor || (isDark ? "#08090b" : "#ffffff");

  const activeTint: BlurTint = tint || (isDark ? "dark" : "light");

  const defaultAlpha = isDark
    ? Platform.OS === "android"
      ? 0.65
      : 0.52
    : Platform.OS === "android"
      ? 0.6
      : 0.48;

  const alpha = overlayAlpha !== undefined ? overlayAlpha : defaultAlpha;
  const computedOverlayColor = overlayColor || hexToRgba(themeBg, alpha);

  const flatStyle = (StyleSheet.flatten(style) || {}) as ViewStyle;
  const borderRadiusStyle = {
    borderRadius: flatStyle.borderRadius,
    borderTopLeftRadius: flatStyle.borderTopLeftRadius,
    borderTopRightRadius: flatStyle.borderTopRightRadius,
    borderBottomLeftRadius: flatStyle.borderBottomLeftRadius,
    borderBottomRightRadius: flatStyle.borderBottomRightRadius,
  };

  const resolvedBlurMethod =
    blurMethod ||
    (Platform.OS === "android"
      ? blurTarget
        ? "dimezisBlurView"
        : "none"
      : undefined);

  return (
    <BlurView
      ref={ref as any}
      tint={activeTint}
      intensity={intensity}
      blurTarget={blurTarget}
      blurMethod={resolvedBlurMethod}
      blurReductionFactor={blurReductionFactor}
      style={[styles.container, style as any]}
      {...rest}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          borderRadiusStyle,
          { backgroundColor: computedOverlayColor },
        ]}
      />
      {children}
    </BlurView>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});

export default AppBlurView;
