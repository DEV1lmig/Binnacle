import { useCssElement } from "react-native-css";
import React from "react";
import { Image as RNImage } from "react-native";

export type ImageProps = React.ComponentProps<typeof RNImage> & {
  className?: string;
};

function CSSImage(props: React.ComponentProps<typeof RNImage>) {
  return <RNImage {...props} />;
}

export const Image = (props: ImageProps) => {
  return useCssElement(CSSImage, props, { className: "style" });
};

Image.displayName = "CSS(Image)";
