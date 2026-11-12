import { StyleSheet, Text, type TextProps } from "react-native";

function AppText({ style, ...props }: TextProps) {
  const textStyle = StyleSheet.flatten(style);
  const fontWeight = textStyle?.fontWeight;
  const isDisplay =
    Number(textStyle?.fontSize) >= 16 &&
    (fontWeight === "bold" ||
      (fontWeight !== undefined && Number(fontWeight) >= 700));

  return (
    <Text
      {...props}
      style={[
        { fontFamily: isDisplay ? "Oswald" : "Inter" },
        isDisplay && styles.display,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  display: {
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});

export default AppText;
