import {
  getDataSaver,
  setDataSaver as saveDataSaver,
} from "@/services/ApiServices";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Colors } from "../constants/Colors";

const THEME_KEY = "isDark";
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setDarkState] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDataSaver, setIsDataSaver] = useState(true);

  useEffect(() => {
    async function loadStoredSettings() {
      try {
        const [savedTheme, savedDataSaver] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          getDataSaver(),
        ]);

        if (savedTheme !== null) setDarkState(JSON.parse(savedTheme));
        setIsDataSaver(savedDataSaver);
      } catch (error) {
        console.error("Failed to load settings from local storage:", error);
      } finally {
        setIsLoaded(true);
      }
    }

    loadStoredSettings();
  }, []);

  const setDark = useCallback(async (value) => {
    try {
      setDarkState(value);
      await AsyncStorage.setItem(THEME_KEY, JSON.stringify(value));
    } catch (error) {
      console.error("Failed to save theme to local storage:", error);
    }
  }, []);

  const toggleTheme = useCallback(() => setDark(!isDark), [isDark, setDark]);

  // Update state first so the switch responds instantly, then persist
  const setDataSaverValue = useCallback((value) => {
    setIsDataSaver(value);
    saveDataSaver(value);
  }, []);

  const onToggleDataSaver = useCallback(
    () => setDataSaverValue(!isDataSaver),
    [isDataSaver, setDataSaverValue],
  );

  const colorScheme = isDark ? Colors.dark : Colors.light;

  // Hooks must run before any early return
  const value = useMemo(
    () => ({
      colorScheme,
      toggleTheme,
      isDark,
      setDark,
      isDataSaver,
      setDataSaver: setDataSaverValue,
      onToggleDataSaver,
    }),
    [
      colorScheme,
      toggleTheme,
      isDark,
      setDark,
      isDataSaver,
      setDataSaverValue,
      onToggleDataSaver,
    ],
  );

  // Prevent flash of wrong state before AsyncStorage reads complete
  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeProvider() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeProvider must be used within a ThemeProvider");
  }
  return context;
}
