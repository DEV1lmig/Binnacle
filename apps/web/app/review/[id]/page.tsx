import type { Metadata } from "next";
import ReviewDetailClient from "./ReviewDetailClient";
import {
  buildShareImagePath,
  DEFAULT_SHARE_OPTIONS,
} from "@binnacle/shared-types";

type Props = {
  params: { id: string } | Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const imageUrl = buildShareImagePath(id, {
    ...DEFAULT_SHARE_OPTIONS,
    format: "wide",
  });

  return {
    title: "Review on Binnacle",
    description: "Check out this game review on Binnacle",
    openGraph: {
      title: "Review on Binnacle",
      description: "Check out this game review on Binnacle",
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: "Review on Binnacle",
      description: "Check out this game review on Binnacle",
      images: [imageUrl],
    },
  };
}

export default function ReviewDetailPage() {
  return <ReviewDetailClient />;
}
