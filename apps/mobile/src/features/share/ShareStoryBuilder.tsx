import { useMemo, useState, useCallback } from "react";
import { Alert, ActivityIndicator, useWindowDimensions } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as Clipboard from "expo-clipboard";
import { saveImageToGallery } from "./saveToGallery";
import {
  buildShareImagePath,
  SHARE_CARD_FORMATS,
  SHARE_CARD_ACCENTS,
  SHARE_ACCENT_COLORS,
  getShareImageDimensions,
  DEFAULT_SHARE_OPTIONS,
  type ShareCardOptions,
  type ShareCardFormat,
} from "@binnacle/shared-types";
import Constants from "expo-constants";
import { getShareBaseUrl } from "@/src/lib/share";
import { Button, Screen } from "@/src/ui/primitives";
import { View, Text, ScrollView, Pressable } from "@/src/tw";
import { Image } from "@/src/tw/image";
import { C, FONT_MONO, FONT_HEADING, FONT_BODY } from "@binnacle/design-tokens";
import { X, ImageIcon, Camera } from "lucide-react-native";

/**
 * Facebook App ID used as the `source_application` Instagram requires for
 * Stories sharing on iOS. Set EXPO_PUBLIC_FACEBOOK_APP_ID or app.json
 * `extra.facebookAppId`. Sharing still opens without it, but attribution
 * (the "Posted by" sticker / link back) won't appear.
 */
const FACEBOOK_APP_ID =
  process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ||
  ((Constants.expoConfig?.extra?.facebookAppId as string | undefined) ?? "");

type ShareStoryBuilderProps = {
  reviewId: string;
  gameTitle: string;
  onClose: () => void;
};

const FORMAT_LABELS: Record<ShareCardFormat, string> = {
  story: "Story 9:16",
  square: "Square 1:1",
  wide: "Wide OG",
};

export function ShareStoryBuilder({
  reviewId,
  gameTitle,
  onClose,
}: ShareStoryBuilderProps) {
  const { width } = useWindowDimensions();
  const [options, setOptions] = useState<ShareCardOptions>(DEFAULT_SHARE_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);

  const baseUrl = getShareBaseUrl();

  const imageUrl = useMemo(() => {
    const path = buildShareImagePath(reviewId, options);
    return `${baseUrl}${path}`;
  }, [reviewId, options, baseUrl]);

  const shareUrl = useMemo(
    () => `${baseUrl}/review/${reviewId}`,
    [baseUrl, reviewId]
  );

  const fileName = useMemo(
    () => `binnacle-story-${reviewId}-${options.format}.png`,
    [reviewId, options.format]
  );

  const downloadToCache = useCallback(async () => {
    const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!cacheDir) throw new Error("No cache directory available");
    const fileUri = `${cacheDir}${fileName}`;
    const result = await FileSystem.downloadAsync(imageUrl, fileUri);
    return result.uri;
  }, [imageUrl, fileName]);

  const nativeShare = useCallback(
    async (fileUri: string) => {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Sharing not available");
        return;
      }
      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        dialogTitle: `Share review of ${gameTitle}`,
      });
    },
    [gameTitle]
  );

  const handleShare = useCallback(async () => {
    setLoading(true);
    try {
      const fileUri = await downloadToCache();
      await nativeShare(fileUri);
    } catch (error) {
      console.error("Failed to share image:", error);
      Alert.alert("Could not share image", "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [downloadToCache, nativeShare]);

  /**
   * Opens Instagram Stories directly with the review card as the full-screen
   * background, instead of the OS share sheet. Requires a development/production
   * build (react-native-share is a native module — not available in Expo Go).
   * Falls back to the native share sheet if Instagram isn't installed or the
   * native module is missing.
   */
  const handleShareToInstagram = useCallback(async () => {
    setLoading(true);
    let fileUri: string | null = null;
    try {
      // Force the 9:16 story format — it fills the Instagram Stories canvas.
      const storyPath = buildShareImagePath(reviewId, { ...options, format: "story" });
      const storyUrl = `${baseUrl}${storyPath}`;
      const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!cacheDir) throw new Error("No cache directory available");
      fileUri = (
        await FileSystem.downloadAsync(storyUrl, `${cacheDir}binnacle-ig-${reviewId}.png`)
      ).uri;

      // Lazy-require so the screen still runs in Expo Go (where the native
      // module is absent); the require throws there and we fall back.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const RNShare = require("react-native-share").default as
        | typeof import("react-native-share").default
        | undefined;
      const Social = require("react-native-share").Social as
        | typeof import("react-native-share").Social
        | undefined;

      if (!RNShare || !Social) {
        await nativeShare(fileUri);
        return;
      }

      // Instagram needs the image as a base64 data URI (it reads it from the
      // iOS pasteboard / Android intent extra).
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: "base64",
      });
      const backgroundImage = `data:image/png;base64,${base64}`;

      await RNShare.shareSingle({
        social: Social.InstagramStories,
        appId: FACEBOOK_APP_ID,
        backgroundImage,
        attributionURL: shareUrl,
      });
    } catch (error: any) {
      // User cancelled — don't treat as an error or fall back.
      const msg = String(error?.message ?? error ?? "");
      if (/cancel/i.test(msg) || error?.error === "User did not share") {
        return;
      }
      console.warn("Instagram Stories share failed, falling back:", error);
      if (fileUri) {
        try {
          await nativeShare(fileUri);
        } catch {
          Alert.alert(
            "Could not open Instagram",
            "Make sure Instagram is installed, or use Save to gallery."
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }, [reviewId, options, baseUrl, nativeShare, shareUrl]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const fileUri = await downloadToCache();
      await saveImageToGallery(fileUri);
      Alert.alert("Saved", "Story image saved to your gallery.");
    } catch (error: any) {
      if (error?.message === "Permission denied") {
        Alert.alert(
          "Permission needed",
          "Allow access to your photo library to save review cards."
        );
        return;
      }
      console.error("Failed to save image:", error);
      Alert.alert("Could not save image", "Please try again.");
    } finally {
      setSaving(false);
    }
  }, [downloadToCache]);

  const handleCopyLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(shareUrl);
      Alert.alert("Copied", "Review link copied to clipboard.");
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  }, [shareUrl]);

  // Size the preview to the selected aspect ratio, capped to fit the screen.
  const { width: imgW, height: imgH } = getShareImageDimensions(options.format);
  const aspect = imgW / imgH;
  const maxPreviewHeight = 300;
  let previewWidth = Math.min(width - 32, 260);
  let previewHeight = previewWidth / aspect;
  if (previewHeight > maxPreviewHeight) {
    previewHeight = maxPreviewHeight;
    previewWidth = previewHeight * aspect;
  }

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      {/* Header */}
      <View
        className="flex-row items-center justify-between"
        style={{ paddingHorizontal: 4, paddingBottom: 12, borderBottomWidth: 1, borderColor: C.borderLight }}
      >
        <View className="flex-row items-center gap-2">
          <ImageIcon size={18} color={C.gold} />
          <Text style={{ fontFamily: FONT_HEADING, color: C.text }} className="text-base">
            Share as image
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12}>
          <X size={22} color={C.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="gap-6 pt-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Preview */}
        <View className="items-center">
          <View
            className="rounded-lg overflow-hidden border items-center justify-center"
            style={{ width: previewWidth, height: previewHeight, borderColor: C.borderLight, backgroundColor: C.bgAlt }}
          >
            <Image
              key={imageUrl}
              source={{ uri: imageUrl }}
              style={{ width: previewWidth, height: previewHeight }}
              resizeMode="contain"
              onLoadStart={() => setPreviewLoading(true)}
              onLoadEnd={() => setPreviewLoading(false)}
            />
            {previewLoading && (
              <View className="absolute inset-0 items-center justify-center">
                <ActivityIndicator color={C.gold} />
              </View>
            )}
          </View>
        </View>

        {/* Format */}
        <View className="gap-2">
          <Text style={{ fontFamily: FONT_MONO, color: C.textMuted }} className="text-[10px] uppercase tracking-widest">
            Format
          </Text>
          <View className="flex-row gap-2">
            {SHARE_CARD_FORMATS.map((format) => {
              const active = options.format === format;
              return (
                <Pressable
                  key={format}
                  onPress={() => setOptions((prev) => ({ ...prev, format }))}
                  className="flex-1 items-center justify-center py-2.5 rounded border"
                  style={{
                    backgroundColor: active ? C.gold : C.bgAlt,
                    borderColor: active ? C.gold : C.borderLight,
                  }}
                >
                  <Text
                    style={{ fontFamily: FONT_MONO, color: active ? C.bg : C.textMuted }}
                    className="text-[10px] uppercase tracking-wider"
                  >
                    {FORMAT_LABELS[format]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Accent */}
        <View className="gap-2">
          <Text style={{ fontFamily: FONT_MONO, color: C.textMuted }} className="text-[10px] uppercase tracking-widest">
            Accent
          </Text>
          <View className="flex-row gap-3">
            {SHARE_CARD_ACCENTS.map((accent) => {
              const active = options.accent === accent;
              return (
                <Pressable
                  key={accent}
                  onPress={() => setOptions((prev) => ({ ...prev, accent }))}
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: SHARE_ACCENT_COLORS[accent],
                    borderWidth: active ? 3 : 0,
                    borderColor: C.text,
                  }}
                />
              );
            })}
          </View>
        </View>

        {/* Toggles */}
        <View className="gap-1">
          <ToggleRow
            label="Show review text"
            value={options.showText}
            onValueChange={(showText) => setOptions((prev) => ({ ...prev, showText }))}
          />
          <ToggleRow
            label="Show game poster"
            value={options.showPoster}
            onValueChange={(showPoster) => setOptions((prev) => ({ ...prev, showPoster }))}
          />
        </View>

        {/* Actions */}
        <View className="gap-2 mt-2">
          {/* Primary: open Instagram Stories directly */}
          <Pressable
            onPress={handleShareToInstagram}
            disabled={loading}
            className="min-h-12 rounded-sm items-center justify-center px-4 flex-row gap-2 active:opacity-80"
            style={{ backgroundColor: C.gold, opacity: loading ? 0.5 : 1 }}
          >
            <Camera size={18} color={C.bg} />
            <Text
              style={{ fontFamily: FONT_MONO, color: C.bg }}
              className="text-sm uppercase tracking-wider"
            >
              {loading ? "Opening..." : "Share to Instagram Story"}
            </Text>
          </Pressable>

          <Button
            label="Other apps…"
            variant="secondary"
            onPress={handleShare}
            disabled={loading}
          />

          <View className="flex-row gap-2">
            <Button
              label={saving ? "Saving..." : "Save to gallery"}
              variant="secondary"
              onPress={handleSave}
              disabled={saving}
              style={{ flex: 1 }}
            />
            <Button
              label="Copy link"
              variant="secondary"
              onPress={handleCopyLink}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      className="flex-row items-center justify-between py-2.5"
    >
      <Text style={{ fontFamily: FONT_BODY, color: C.text }} className="text-sm">
        {label}
      </Text>
      <View
        className="rounded-full p-0.5"
        style={{ width: 48, height: 28, backgroundColor: value ? C.gold : C.border }}
      >
        <View
          className="rounded-full"
          style={{ width: 24, height: 24, backgroundColor: C.bg, marginLeft: value ? 20 : 0 }}
        />
      </View>
    </Pressable>
  );
}
