export const Colors = {
  light: {
    // Core background & surfaces
    background: "#ffffff",
    surface: "#f1f1f3",
    card: "#f1f1f3",
    border: "#e1e2e5",
    primary: "#8B5CF6",

    // Common aliases used in pages
    bgColor: "#ffffff",
    cardBg: "#f1f1f3",
    borderColor: "#e1e2e5",

    // Typography
    textPrimary: "#17181c",
    textSecondary: "#54565c",
    subText: "#8b8d94",
    mutedColor: "#8b8d94",
    primaryText: "#17181c",
    secondaryText: "#54565c",
    textColor: "#17181c",
    subTextColor: "#8b8d94",

    // Media & placeholders
    imagePlaceholder: "#e5e5e5",
    imageBg: "#e5e5e5",
    posterBg: "#e5e5e5",
    placeholderBg: "#ececef",

    // Action buttons & UI elements
    listBtnBg: "#ffffff",
    listBtnBorder: "#e1e2e5",
    playBtnBg: "#08090b",
    playBtnText: "#ffffff",
    cancelBg: "#f1f1f3",
    dialogBg: "#ffffff",
    dialogBorder: "#e4e4e7",
    inputBg: "#f1f1f3",
    inputBorder: "#d1d1d6",
    accent: "#08090b",

    // Tabs & Navigation
    tabActive: "#000000",
    tabInactive: "#92929b",
    tabBarBorder: "rgba(0, 0, 0, 0.08)",
    activeColor: "#000000",
    inactiveColor: "#92929b",
    blurTint: "light" as const,
    searchBlurTint: "light" as const,

    // Skeleton
    baseColor: "#e5e5e5",
    highlightColor: "#f4f4f5",

    // Details & Meta
    ratingColor: "#222222",
    detailColor: "#777777",
    metaColor: "#8b8d94",

    // Gradients & Overlays
    fadeGradient: [
      "rgba(255, 255, 255, 0)",
      "rgba(255, 255, 255, 0.35)",
      "#ffffff",
    ] as [string, string, string],
    dotInactive: "rgba(0, 0, 0, 0.2)",
    scrollTopBorder: "rgba(23, 24, 28, 0.14)",
    scrollTopBg: "rgba(255, 255, 255, 0.92)",
  },
  dark: {
    // Core background & surfaces
    background: "#08090b",
    surface: "#18181b",
    card: "#18181b",
    border: "#27272a",
    primary: "#8B5CF6",

    // Common aliases used in pages
    bgColor: "#08090b",
    cardBg: "#18181b",
    borderColor: "#27272a",

    // Typography
    textPrimary: "#ffffff",
    textSecondary: "#a1a1aa",
    subText: "#71717a",
    mutedColor: "#a1a1aa",
    primaryText: "#ffffff",
    secondaryText: "#a1a1aa",
    textColor: "#ffffff",
    subTextColor: "#a1a1aa",

    // Media & placeholders
    imagePlaceholder: "#27272a",
    imageBg: "#27272a",
    posterBg: "#18181b",
    placeholderBg: "#18181b",

    // Action buttons & UI elements
    listBtnBg: "#18181b",
    listBtnBorder: "#27272a",
    playBtnBg: "#ffffff",
    playBtnText: "#08090b",
    cancelBg: "#27272a",
    dialogBg: "#18181b",
    dialogBorder: "#3f3f46",
    inputBg: "#18181b",
    inputBorder: "#27272a",
    accent: "#ffffff",

    // Tabs & Navigation
    tabActive: "#ffffff",
    tabInactive: "#71717a",
    tabBarBorder: "rgba(255, 255, 255, 0.1)",
    activeColor: "#ffffff",
    inactiveColor: "#71717a",
    blurTint: "dark" as const,
    searchBlurTint: "dark" as const,

    // Skeleton
    baseColor: "#18181b",
    highlightColor: "#27272a",

    // Details & Meta
    ratingColor: "#d4d4d8",
    detailColor: "#a1a1aa",
    metaColor: "#a1a1aa",

    // Gradients & Overlays
    fadeGradient: [
      "rgba(8, 9, 11, 0)",
      "rgba(8, 9, 11, 0.65)",
      "#08090b",
    ] as [string, string, string],
    dotInactive: "rgba(255, 255, 255, 0.3)",
    scrollTopBorder: "#3f3f46",
    scrollTopBg: "rgba(24, 24, 27, 0.92)",
  },
};

export type ThemeColors = typeof Colors.dark;
