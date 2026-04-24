"use client";

import dynamic from "next/dynamic";

const WebVitalsReporter = dynamic(
  () => import("@/components/web-vitals-reporter").then((m) => m.WebVitalsReporter),
  { ssr: false },
);

export function WebVitalsLoader() {
  return <WebVitalsReporter />;
}
