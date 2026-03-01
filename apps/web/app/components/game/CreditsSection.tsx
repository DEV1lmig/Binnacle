"use client";

import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";
import { CornerMarkers } from "@/app/lib/design-primitives";

interface CreditsData {
  name: string;
  isDeveloper: boolean;
  isPublisher: boolean;
}

interface CreditsSectionProps {
  developers?: string;
  publishers?: string;
}

export function CreditsSection({
  developers,
  publishers,
}: CreditsSectionProps) {
  const parseCredits = (data: string | undefined): CreditsData[] => {
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  };

  const developerList = parseCredits(developers);
  const publisherList = parseCredits(publishers);

  const hasData = developerList.length > 0 || publisherList.length > 0;

  if (!hasData) return null;

  const uniqueDevelopers = Array.from(
    new Map(developerList.map((d) => [d.name, d])).values()
  );
  const uniquePublishers = Array.from(
    new Map(publisherList.map((p) => [p.name, p])).values()
  );

  return (
    <section
      className="flex flex-col gap-6 p-6"
      style={{
        position: "relative",
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
      }}
    >
      <CornerMarkers size={8} />
      <h2
        style={{
          fontFamily: FONT_HEADING,
          fontWeight: 200,
          fontSize: 20,
          color: C.text,
          margin: 0,
        }}
      >
        Credits
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {uniqueDevelopers.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                fontWeight: 400,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: C.textMuted,
                margin: 0,
              }}
            >
              Developers
            </h3>
            <div className="flex flex-col gap-2">
              {uniqueDevelopers.map((dev) => (
                <div
                  key={dev.name}
                  className="flex items-center gap-2 px-3 py-2"
                  style={{
                    background: C.bgAlt,
                    border: `1px solid ${C.border}`,
                    borderRadius: 1,
                    color: C.text,
                    fontFamily: FONT_BODY,
                    fontSize: 13,
                  }}
                >
                  <svg
                    style={{ width: 16, height: 16, color: C.gold, flexShrink: 0 }}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v4h8v-4zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  {dev.name}
                </div>
              ))}
            </div>
          </div>
        )}
        {uniquePublishers.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                fontWeight: 400,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: C.textMuted,
                margin: 0,
              }}
            >
              Publishers
            </h3>
            <div className="flex flex-col gap-2">
              {uniquePublishers.map((pub) => (
                <div
                  key={pub.name}
                  className="flex items-center gap-2 px-3 py-2"
                  style={{
                    background: C.bgAlt,
                    border: `1px solid ${C.border}`,
                    borderRadius: 1,
                    color: C.text,
                    fontFamily: FONT_BODY,
                    fontSize: 13,
                  }}
                >
                  <svg
                    style={{ width: 16, height: 16, color: C.amber, flexShrink: 0 }}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 6H6.28l-.31-1.243A1 1 0 005 4H3zm5 16a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {pub.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
