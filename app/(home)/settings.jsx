import Ionicons from "@expo/vector-icons/Ionicons";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeProvider } from "../../components/ThemeProvider";
import {
  DEFAULT_SUBTITLE,
  getSubtitlesStorage,
  setSubtitlesStorage,
  SUBTITLE_OPTIONS,
} from "../../services/ApiServices";

export default function SettingsScreen() {
  const { isDark, colorScheme, toggleTheme } = useThemeProvider();
  const [subtitle, setSubtitle] = useState(DEFAULT_SUBTITLE);
  const [showIosPicker, setShowIosPicker] = useState(false);

  const textColor = isDark ? "#ffffff" : "#111111";
  const mutedColor = isDark ? "#a1a1aa" : "#8b8d94";
  const cardBg = isDark ? "#18181b" : "#f1f1f3";
  const borderColor = isDark ? "#27272a" : "#e1e2e5";
  const accent = isDark ? "#ffffff" : "#08090b";

  const selectedLabel =
    SUBTITLE_OPTIONS.find((o) => o.value === subtitle)?.label ?? "English";

  // Load once on mount — the missing dependency array in the original
  // caused this to re-run (and re-read storage) on every single render.
  useEffect(() => {
    (async () => {
      const stored = await getSubtitlesStorage();
      setSubtitle(stored);
    })();
  }, []);

  async function selectSubtitle(value) {
    setSubtitle(value);
    await setSubtitlesStorage(value);
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colorScheme.background }]}
    >
      <SafeAreaView edges={["top"]} style={{ paddingTop: 20 }}>
        <View style={[styles.listTile, { borderColor }]}>
          <Text style={[styles.title, { color: textColor }]}>Dark Mode</Text>
          <Switch value={isDark} onChange={toggleTheme} />
        </View>

        <View style={[styles.listTile, { borderColor }]}>
          <Text style={[styles.title, { color: textColor }]}>Subtitle</Text>

          {Platform.OS === "ios" ? (
            <Pressable
              style={styles.pickerTrigger}
              onPress={() => setShowIosPicker(true)}
            >
              <Text style={[styles.pickerTriggerText, { color: mutedColor }]}>
                {selectedLabel}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={mutedColor} />
            </Pressable>
          ) : (
            <View
              style={[styles.androidPickerWrapper, { backgroundColor: cardBg }]}
            >
              <Picker
                selectedValue={subtitle}
                onValueChange={(value) => selectSubtitle(value)}
                mode="dropdown"
                style={{ color: textColor, width: 150 }}
                dropdownIconColor={mutedColor}
              >
                {SUBTITLE_OPTIONS.map((option) => (
                  <Picker.Item
                    key={option.value}
                    label={option.label}
                    value={option.value}
                    color={textColor}
                  />
                ))}
              </Picker>
            </View>
          )}
        </View>
      </SafeAreaView>

      {Platform.OS === "ios" && (
        <Modal
          visible={showIosPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowIosPicker(false)}
        >
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => setShowIosPicker(false)}
          >
            <Pressable
              style={[styles.pickerSheet, { backgroundColor: cardBg }]}
            >
              <View style={[styles.pickerSheetHeader, { borderColor }]}>
                <Text style={[styles.pickerSheetTitle, { color: textColor }]}>
                  Subtitle
                </Text>
                <Pressable onPress={() => setShowIosPicker(false)}>
                  <Text style={[styles.pickerDoneText, { color: accent }]}>
                    Done
                  </Text>
                </Pressable>
              </View>
              <Picker
                selectedValue={subtitle}
                onValueChange={(value) => selectSubtitle(value)}
                itemStyle={{ color: textColor }}
              >
                {SUBTITLE_OPTIONS.map((option) => (
                  <Picker.Item
                    key={option.value}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </Picker>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "column", justifyContent: "flex-start" },
  listTile: {
    flexDirection: "row",
    width: "auto",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    marginHorizontal: 10,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 20,
  },
  title: { alignSelf: "center", fontSize: 16, fontWeight: "600" },
  pickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  pickerTriggerText: { fontSize: 15 },
  androidPickerWrapper: { borderRadius: 8, overflow: "hidden" },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  pickerSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerSheetTitle: { fontSize: 15, fontWeight: "700" },
  pickerDoneText: { fontSize: 15, fontWeight: "700" },
});
