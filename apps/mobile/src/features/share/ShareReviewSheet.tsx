import { useMemo, useCallback } from "react";
import {
  Modal,
  Pressable as RNPressable,
  Share,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getShareBaseUrl } from "@/src/lib/share";
import { C, FONT_MONO, FONT_HEADING } from "@binnacle/design-tokens";
import { View, Text } from "@/src/tw";
import { Share2, Camera, X } from "lucide-react-native";

type ShareReviewSheetProps = {
  reviewId: string;
  gameTitle: string;
  open: boolean;
  onClose: () => void;
};

export function ShareReviewSheet({
  reviewId,
  gameTitle,
  open,
  onClose,
}: ShareReviewSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const shareUrl = useMemo(() => {
    const baseUrl = getShareBaseUrl();
    return `${baseUrl}/review/${reviewId}`;
  }, [reviewId]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        title: gameTitle,
        message: `Check out this review of ${gameTitle}\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      console.error("Failed to open share sheet:", error);
    }
  }, [gameTitle, shareUrl]);

  const handleInstagramStory = useCallback(() => {
    onClose();
    router.push(`/share-story/${reviewId}`);
  }, [onClose, reviewId, router]);

  return (
    <Modal
      visible={open}
      onRequestClose={onClose}
      animationType="slide"
      transparent
      statusBarTranslucent
    >
      {/* Backdrop — tap outside to dismiss */}
      <RNPressable
        style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.65)" }}
        onPress={onClose}
      >
        {/* Sheet panel */}
        <RNPressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: C.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: C.borderLight,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 24,
          }}
        >
          {/* Drag handle */}
          <View className="items-center pt-3 pb-1">
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.borderLight }} />
          </View>

          {/* Header row */}
          <View
            className="flex-row items-center justify-between"
            style={{ paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderColor: C.borderLight }}
          >
            <Text style={{ fontFamily: FONT_MONO, color: C.textMuted }} className="text-[10px] uppercase tracking-widest">
              Share
            </Text>
            <RNPressable onPress={onClose} hitSlop={14}>
              <X size={18} color={C.textMuted} />
            </RNPressable>
          </View>

          {/* Game title */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
            <Text style={{ fontFamily: FONT_HEADING, color: C.text }} className="text-base" numberOfLines={1}>
              {gameTitle}
            </Text>
          </View>

          {/* Options */}
          <View style={{ paddingHorizontal: 12, paddingTop: 8, gap: 4 }}>
            <OptionRow icon={Share2} label="Share link" onPress={handleShare} />
            <OptionRow icon={Camera} label="Share in Instagram Story" onPress={handleInstagramStory} />
          </View>
        </RNPressable>
      </RNPressable>
    </Modal>
  );
}

function OptionRow({
  icon: Icon,
  label,
  onPress,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  onPress: () => void;
}) {
  return (
    <RNPressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: pressed ? C.bgAlt : "transparent",
      })}
    >
      {/* Icon badge */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          backgroundColor: C.bgAlt,
          borderWidth: 1,
          borderColor: C.borderLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={20} color={C.gold} />
      </View>
      <Text style={{ fontFamily: FONT_HEADING, color: C.text, fontSize: 15 }}>
        {label}
      </Text>
    </RNPressable>
  );
}
