import AppBlurView from "@/components/AppBlurView";
import AppText from "@/components/AppText";
import { useThemeProvider } from "@/components/ThemeProvider";
import { getMovieReviews } from "@/services/ApiServices";
import Ionicons from "@expo/vector-icons/Ionicons";
import { formatDistanceToNowStrict, isValid } from "date-fns";
import { BlurTargetView } from "expo-blur";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface AuthorDetails {
  name: string | null;
  username: string;
  avatar_path: string | null;
  rating: number | null;
}

interface Review {
  id: string;
  author: string;
  content: string;
  created_at: string;
  author_details: AuthorDetails;
}

interface ReviewsResponse {
  results: Review[];
}

const MAX_REVIEW_PREVIEW_LENGTH = 280;
const HEADER_CONTENT_HEIGHT = 56;

type ReviewsState =
  | { requestKey: string; status: "loading" }
  | { requestKey: string; status: "success"; reviews: Review[] }
  | { requestKey: string; status: "error"; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isReview(value: unknown): value is Review {
  if (!isRecord(value) || !isRecord(value.author_details)) {
    return false;
  }

  const authorDetails = value.author_details;
  return (
    typeof value.id === "string" &&
    typeof value.author === "string" &&
    typeof value.content === "string" &&
    typeof value.created_at === "string" &&
    (authorDetails.name === null || typeof authorDetails.name === "string") &&
    typeof authorDetails.username === "string" &&
    (authorDetails.avatar_path === null ||
      typeof authorDetails.avatar_path === "string") &&
    (authorDetails.rating === null || typeof authorDetails.rating === "number")
  );
}

function isReviewsResponse(value: unknown): value is ReviewsResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.results) &&
    value.results.every(isReview)
  );
}

function getAvatarUri(avatarPath: string | null) {
  if (!avatarPath) return null;
  if (avatarPath.startsWith("/https://") || avatarPath.startsWith("/http://")) {
    return avatarPath.slice(1);
  }
  if (/^https?:\/\//i.test(avatarPath)) return avatarPath;
  return `https://image.tmdb.org/t/p/w185${avatarPath}`;
}

function getRelativeTime(createdAt: string) {
  const date = new Date(createdAt);
  return isValid(date) ? formatDistanceToNowStrict(date, { addSuffix: true }) : "";
}

function getReviewPreview(content: string) {
  if (content.length <= MAX_REVIEW_PREVIEW_LENGTH) {
    return { hasMore: false, preview: content };
  }

  let end = content.lastIndexOf(" ", MAX_REVIEW_PREVIEW_LENGTH);
  if (end < MAX_REVIEW_PREVIEW_LENGTH * 0.75) {
    end = MAX_REVIEW_PREVIEW_LENGTH;
  }

  return {
    hasMore: true,
    preview: `${content.slice(0, end).trimEnd()}…`,
  };
}

export default function ReviewsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useThemeProvider();
  const { bgColor, borderColor, cardBg, primary, primaryText, secondaryText, subText } =
    colors;
  const insets = useSafeAreaInsets();
  const blurTargetRef = useRef<ComponentRef<typeof View> | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loadState, setLoadState] = useState<ReviewsState | null>(null);
  const [expandedReviewIds, setExpandedReviewIds] = useState<Set<string>>(
    () => new Set(),
  );
  const requestKey = id ? `${id}:${retryCount}` : "";

  function toggleReviewExpanded(reviewId: string) {
    setExpandedReviewIds((current) => {
      const next = new Set(current);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  }

  useEffect(() => {
    if (!id) return;

    let isCurrentRequest = true;

    async function loadReviews() {
      try {
        const response = await getMovieReviews(id);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data: unknown = await response.json();
        if (!isReviewsResponse(data)) {
          throw new Error("The reviews response had an unexpected format.");
        }

        if (isCurrentRequest) {
          setLoadState({ requestKey, status: "success", reviews: data.results });
        }
      } catch (error) {
        if (isCurrentRequest) {
          console.error("Unable to load movie reviews:", error);
          setLoadState({
            requestKey,
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred while loading reviews.",
          });
        }
      }
    }

    void loadReviews();

    return () => {
      isCurrentRequest = false;
    };
  }, [id, requestKey]);

  const state: ReviewsState = !id
    ? {
        requestKey,
        status: "error",
        message: "A movie ID was not provided.",
      }
    : loadState?.requestKey === requestKey
      ? loadState
      : { requestKey, status: "loading" };
  const reviews = state.status === "success" ? state.reviews : [];

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: bgColor }]}>
      <BlurTargetView ref={blurTargetRef} style={StyleSheet.absoluteFill}>
        <FlatList
          style={styles.list}
          data={reviews}
          keyExtractor={(review) => review.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + HEADER_CONTENT_HEIGHT },
            reviews.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={[styles.feedHeader, { borderBottomColor: borderColor }]}>
            <AppText style={[styles.heading, { color: primaryText }]}>
              Community reviews
            </AppText>
            <AppText style={[styles.subtitle, { color: subText }]}>
              {state.status === "success"
                ? `${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`
                : "Reviews for this movie"}
            </AppText>
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: borderColor }]} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {state.status === "loading" ? (
              <>
                <ActivityIndicator color={primary} />
                <AppText style={[styles.emptyTitle, { color: primaryText }]}>
                  Loading reviews
                </AppText>
              </>
            ) : state.status === "error" ? (
              <>
                <AppText style={[styles.emptyTitle, { color: primaryText }]}>
                  Couldn’t load reviews
                </AppText>
                <AppText style={[styles.emptyMessage, { color: secondaryText }]}>
                  {state.message}
                </AppText>
                {id ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setRetryCount((count) => count + 1)}
                    style={({ pressed }) => [
                      styles.retryButton,
                      { backgroundColor: primary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <AppText style={styles.retryText}>Try again</AppText>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <>
                <AppText style={[styles.emptyTitle, { color: primaryText }]}>
                  No reviews yet
                </AppText>
                <AppText style={[styles.emptyMessage, { color: secondaryText }]}>
                  There aren’t any community reviews for this movie.
                </AppText>
              </>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={state.status === "loading"}
            onRefresh={() => setRetryCount((count) => count + 1)}
            tintColor={primary}
            colors={[primary]}
            progressBackgroundColor={cardBg}
          />
        }
        renderItem={({ item }) => {
          const authorName =
            item.author_details.name?.trim() || item.author.trim() || "Anonymous";
          const username = item.author_details.username.trim();
          const avatarUri = getAvatarUri(item.author_details.avatar_path);
          const relativeTime = getRelativeTime(item.created_at);
          const { hasMore, preview } = getReviewPreview(item.content);
          const isExpanded = expandedReviewIds.has(item.id);

          return (
            <View style={styles.review}>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[styles.avatar, { backgroundColor: cardBg }]}
              >
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    contentFit="cover"
                    style={styles.avatarImage}
                  />
                ) : (
                  <AppText style={[styles.avatarInitial, { color: secondaryText }]}>
                    {authorName.charAt(0).toUpperCase()}
                  </AppText>
                )}
              </View>

              <View style={styles.reviewContent}>
                <View style={styles.authorRow}>
                  <AppText
                    numberOfLines={1}
                    style={[styles.authorName, { color: primaryText }]}
                  >
                    {authorName}
                  </AppText>
                  {username ? (
                    <AppText
                      numberOfLines={1}
                      style={[styles.metadata, { color: subText }]}
                    >
                      @{username.replace(/^@/, "")}
                    </AppText>
                  ) : null}
                  {relativeTime ? (
                    <>
                      <AppText style={[styles.metadata, { color: subText }]}>
                        ·
                      </AppText>
                      <AppText
                        numberOfLines={1}
                        style={[styles.metadata, { color: subText }]}
                      >
                        {relativeTime}
                      </AppText>
                    </>
                  ) : null}
                </View>

                {item.author_details.rating !== null ? (
                  <View
                    accessibilityLabel={`Rating ${item.author_details.rating} out of 10`}
                    style={styles.rating}
                  >
                    <Ionicons name="star" size={13} color={"yellow"} />
                    <AppText style={[styles.ratingText, { color: secondaryText }]}>
                      {item.author_details.rating}/10
                    </AppText>
                  </View>
                ) : null}

                <AppText
                  selectable
                  style={[styles.reviewText, { color: primaryText }]}
                >
                  {hasMore && !isExpanded ? preview : item.content}
                </AppText>
                {hasMore ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      isExpanded ? "Show less review" : "Show full review"
                    }
                    hitSlop={8}
                    onPress={() => toggleReviewExpanded(item.id)}
                    style={styles.moreButton}
                  >
                    <AppText style={[styles.moreText, { color: primary }]}>
                      {isExpanded ? "Show less" : "More"}
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }}
        />
      </BlurTargetView>
      <AppBlurView
        blurTarget={blurTargetRef}
        intensity={80}
        style={[
          styles.header,
          {
            height: insets.top + HEADER_CONTENT_HEIGHT,
            borderBottomColor: borderColor,
          },
        ]}
      >
        <View
          style={[
            styles.headerContent,
            {
              height: insets.top + HEADER_CONTENT_HEIGHT,
              paddingTop: insets.top,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <Ionicons name="arrow-back" size={22} color={primaryText} />
          </Pressable>
          <AppText style={[styles.headerTitle, { color: primaryText }]}>
            Reviews
          </AppText>
          <View style={styles.headerButtonSpacer} />
        </View>
      </AppBlurView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
  },
  headerButton: {
    width: 40,
    height: HEADER_CONTENT_HEIGHT,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerButtonSpacer: {
    width: 40,
    height: HEADER_CONTENT_HEIGHT,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  feedHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
  },
  review: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: "700",
  },
  reviewContent: {
    flex: 1,
    minWidth: 0,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 5,
    rowGap: 2,
  },
  authorName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  metadata: {
    flexShrink: 1,
    fontSize: 13,
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
  },
  reviewText: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 21,
  },
  moreButton: {
    alignSelf: "flex-start",
    marginTop: 5,
  },
  moreText: {
    fontSize: 14,
    fontWeight: "700",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  emptyState: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyMessage: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginTop: 16,
    borderRadius: 22,
  },
  retryText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.75,
  },
});
