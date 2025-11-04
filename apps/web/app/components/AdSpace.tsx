import { ExternalLink } from "lucide-react";

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
      className={`bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] overflow-hidden ${adContent.height} ${className}`}
    >
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[var(--bkl-color-bg-tertiary)] to-[var(--bkl-color-bg-secondary)] relative group">
        {/* Ad Label */}
        <div className="absolute top-2 right-2">
          <span
            className="text-[var(--bkl-color-text-disabled)] bg-[var(--bkl-color-bg-primary)] px-2 py-1 rounded-[var(--bkl-radius-sm)]"
            style={{ fontSize: "var(--bkl-font-size-xs)" }}
          >
            AD
          </span>
        </div>

        {/* Placeholder Content */}
        <ExternalLink className="w-8 h-8 text-[var(--bkl-color-text-disabled)] opacity-50" />
        <p
          className="text-[var(--bkl-color-text-disabled)]"
          style={{
            fontSize: "var(--bkl-font-size-sm)",
            fontWeight: "var(--bkl-font-weight-medium)",
          }}
        >
          {adContent.text}
        </p>
        <p
          className="text-[var(--bkl-color-text-disabled)] opacity-70"
          style={{ fontSize: "var(--bkl-font-size-xs)" }}
        >
          {adContent.subtext}
        </p>
      </div>
    </div>
  );
}