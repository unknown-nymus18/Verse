import { createContext, useContext, useState } from "react";
import { Colors } from "../constants/Colors";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setDark] = useState(true);

  const colorScheme = isDark ? Colors.dark : Colors.light;

  function toggleTheme() {
    setDark(!isDark);
  }
  return (
    <ThemeContext.Provider value={{ colorScheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeProvider() {
  var context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
