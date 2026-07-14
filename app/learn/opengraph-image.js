import { ogImage, size, contentType } from "@/lib/og";

export { size, contentType };
export const alt = "Data usage and Incognito Mode";

/* A segment that sets its own `openGraph` in metadata replaces the inherited one
   wholesale — the root card does NOT carry down to it. Every page that calls
   pageMetadata() therefore needs an image file of its own, or it ships with no
   social card at all. */
export default function Image() {
  return ogImage({
    eyebrow: "Privacy",
    title: "Data usage and Incognito Mode",
    subtitle: "No local history on this device. Incognito requests still go to the backend and configured engine.",
  });
}
