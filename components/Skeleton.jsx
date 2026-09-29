import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useThemeProvider } from "./ThemeProvider";

export default function Skeleton({ width, height, borderRadius = 8, style }) {
  const { isDark } = useThemeProvider();
  const animatedValue = useRef(new Animated.Value(0)).current;

  const baseColor = isDark ? "#18181b" : "#e5e5e5";
  const highlightColor = isDark ? "#27272a" : "#f4f4f5";

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    );
    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [animatedValue]);

  const numericWidth = typeof width === "number" ? width : 300;
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-numericWidth, numericWidth],
  });

  return (
    <View
      style={[
        styles.skeleton,
        { width, height, borderRadius, backgroundColor: baseColor },
        style,
      ]}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}
      >
        <LinearGradient
          colors={["transparent", highlightColor, "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
});
