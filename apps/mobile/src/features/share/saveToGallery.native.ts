import * as MediaLibrary from "expo-media-library";

export async function saveImageToGallery(fileUri: string): Promise<void> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Permission denied");
  }
  await MediaLibrary.saveToLibraryAsync(fileUri);
}
