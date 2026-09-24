import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

// Vidstuck's exact server names lowercased for URL query params
const VIDSTUCK_SERVERS = [
  { id: "andromeda", label: "Andromeda" },
  { id: "atlas", label: "Atlas" },
  { id: "milkyway", label: "Milky Way" },
  { id: "centaurus", label: "Centaurus" },
];

interface VidstuckPlayerProps {
  movieId?: string;
  movieTitle?: string;
}

export default function VidstuckPlayerScreen({
  movieId = "299534",
  movieTitle = "Avengers: Infinity War",
}: VidstuckPlayerProps) {
  // Default to 'andromeda' to skip the broken 'centaurus' connection screen
  const [selectedServer, setSelectedServer] = useState<string>("andromeda");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const webViewRef = useRef<WebView>(null);

  // Construct URL with explicit server parameter
  const embedUrl = `https://vidstuck.xyz/embed/movie/${movieId}?server=${selectedServer}&nextEpisode=true&autoplayNextEpisode=true&color=8B5CF6`;

  // Script injected to auto-click play and dismiss any splash screens
  const injectedBypassJS = `
    (function() {
      window.open = function() { return null; }; // Block ad popups
      
      const autoClickTimer = setInterval(() => {
        const splash = document.querySelector('.connecting, [class*="splash"], [class*="overlay"]');
        const playBtn = document.querySelector('button, video, .play-icon, #player, .vjs-big-play-button');
        
        if (splash) splash.click();
        if (playBtn) {
          playBtn.click();
          clearInterval(autoClickTimer);
        }
      }, 1000);

      setTimeout(() => clearInterval(autoClickTimer), 10000);
    })();
    true;
  `;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.titleText} numberOfLines={1}>
          {movieTitle}
        </Text>
        <Text style={styles.subtitleText}>TMDB ID: {movieId}</Text>
      </View>

      {/* Video Container */}
      <View style={styles.playerWrapper}>
        <WebView
          key={selectedServer} // Re-mounts WebView fresh when switching servers
          ref={webViewRef}
          source={{
            uri: embedUrl,
            headers: {
              Referer: "https://vidstuck.xyz/",
              Origin: "https://vidstuck.xyz",
            },
          }}
          style={styles.webview}
          injectedJavaScript={injectedBypassJS}
          // Media & Script Permissions
          javaScriptEnabled={true}
          domStorageEnabled={true}
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
          // Cross-Origin Settings
          originWhitelist={["*"]}
          mixedContentMode="always"
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          // User Agent Spoofing
          userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onShouldStartLoadWithRequest={() => true}
        />

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>
              Connecting to {selectedServer.toUpperCase()}...
            </Text>
          </View>
        )}
      </View>

      {/* Server Selector Bar */}
      <View style={styles.controlsContainer}>
        <Text style={styles.sectionTitle}>Select Vidstuck Server:</Text>
        <View style={styles.buttonRow}>
          {VIDSTUCK_SERVERS.map((server) => {
            const isActive = selectedServer === server.id;
            return (
              <TouchableOpacity
                key={server.id}
                style={[styles.serverChip, isActive && styles.activeServerChip]}
                onPress={() => {
                  setIsLoading(true);
                  setSelectedServer(server.id);
                }}
              >
                <Text
                  style={[
                    styles.serverChipText,
                    isActive && styles.activeServerChipText,
                  ]}
                >
                  {server.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F12",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  subtitleText: {
    color: "#A1A1AA",
    fontSize: 12,
    marginTop: 2,
  },
  playerWrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000000",
    position: "relative",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#D4D4D8",
    marginTop: 10,
    fontSize: 14,
  },
  controlsContainer: {
    padding: 16,
  },
  sectionTitle: {
    color: "#A1A1AA",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serverChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#18181B",
    borderWidth: 1,
    borderColor: "#27272A",
  },
  activeServerChip: {
    backgroundColor: "#8B5CF6",
    borderColor: "#8B5CF6",
  },
  serverChipText: {
    color: "#A1A1AA",
    fontSize: 14,
    fontWeight: "500",
  },
  activeServerChipText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});
