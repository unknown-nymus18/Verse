import React from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

const VIDEO_URL =
  "https://vidstuck.xyz/embed/tv/1399/1/1?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true&color=8B5CF6&branding=VIDSTUCK&subtitle=english&server=valstrax";

export default function VideoScreen() {
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: VIDEO_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        // iOS video
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsPictureInPictureMediaPlayback={true}
        // Share cookies between Safari/WebViews where supported
        sharedCookiesEnabled={true}
        // Allow navigation
        originWhitelist={["*"]}
        onError={(event) => {
          console.log("WEBVIEW ERROR");
          console.log(event.nativeEvent);
        }}
        onHttpError={(event) => {
          console.log("HTTP ERROR");
          console.log(event.nativeEvent);
        }}
        onNavigationStateChange={(event) => {
          console.log("NAVIGATION");
          console.log(event.url);
        }}
        onOpenWindow={(event) => {
          console.log("OPEN WINDOW");
          console.log(event.nativeEvent.targetUrl);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  webview: {
    flex: 1,
  },
});
