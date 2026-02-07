import { ExternalLink } from "lucide-react";
import { C, FONT_MONO } from "@/app/lib/design-system";

interface AdSpaceProps {
  variant?: "sidebar" | "banner" | "inline";
  className?: string;
}

export function AdSpace({
  variant = "sidebar",
  className = "",
}: AdSpaceProps) {
  const getAdContent = () => {
    switch (variant) {
      case "banner":
        return {
          height: "h-[120px]",
          text: "Advertisement Banner",
          subtext: "728 x 90",
        };
      case "inline":
        return {
          height: "h-[200px]",
          text: "Advertisement",
          subtext: "600 x 200",
        };
      case "sidebar":
      default:
        return {
          height: "h-[250px]",
          text: "Advertisement",
          subtext: "300 x 250",
        };
    }
  };

  const adContent = getAdContent();

  return (
    <div
      className={`overflow-hidden ${adContent.height} ${className}`}
      style={{
        backgroundColor: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
      }}
    >
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-2 relative group"
        style={{
          background: `linear-gradient(to bottom right, ${C.bgAlt}, ${C.surface})`,
        }}
      >
        <div className="absolute top-2 right-2">
          <span
            className="px-2 py-1"
            style={{
              color: C.textDim,
              backgroundColor: C.bg,
              borderRadius: 2,
              fontFamily: FONT_MONO,
              fontSize: 10,
            }}
          >
            AD
          </span>
        </div>

        <ExternalLink
          className="w-8 h-8"
          style={{ color: C.textDim, opacity: 0.5 }}
        />
        <p
          style={{
            color: C.textDim,
            fontFamily: FONT_MONO,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {adContent.text}
        </p>
        <p
          style={{
            color: C.textDim,
            fontFamily: FONT_MONO,
            fontSize: 12,
            opacity: 0.7,
          }}
        >
          {adContent.subtext}
        </p>
      </div>
    </div>
  );
}
