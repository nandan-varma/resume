"use client";

import dynamic from "next/dynamic";

const NetworkBackground = dynamic(
  () =>
    import("@/components/network-background").then((m) => m.NetworkBackground),
  { ssr: false }
);

export function NetworkBackgroundWrapper() {
  return <NetworkBackground />;
}
