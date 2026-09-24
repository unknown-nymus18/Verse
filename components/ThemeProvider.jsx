import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { Colors } from "../constants/Colors";

const THEME_KEY = "isDark";
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setDarkState] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadStoredTheme() {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_KEY);
        if (savedTheme !== null) {
          setDarkState(JSON.parse(savedTheme));
        }
      } catch (error) {
        console.error("Failed to load theme from local storage:", error);
      } finally {
        setIsLoaded(true);
      }
    }

    loadStoredTheme();
  }, []);

  async function setDark(value) {
    try {
      setDarkState(value);
      await AsyncStorage.setItem(THEME_KEY, JSON.stringify(value));
    } catch (error) {
      console.error("Failed to save theme to local storage:", error);
    }
  }

  async function toggleTheme() {
    try {
      const nextValue = !isDark;
      setDarkState(nextValue);
      await AsyncStorage.setItem(THEME_KEY, JSON.stringify(nextValue));
    } catch (error) {
      console.error("Failed to save theme to local storage:", error);
    }
  }

  const colorScheme = isDark ? Colors.dark : Colors.light;

  // Prevent flash of wrong theme before AsyncStorage reads complete
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{ colorScheme, toggleTheme, isDark, setDark }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeProvider() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
