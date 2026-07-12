import { ogImage, size, contentType } from "@/lib/og";

export { size, contentType };
export const alt = "Privacy policy";

export default function Image() {
  return ogImage({
    eyebrow: "Legal",
    title: "Privacy policy",
    subtitle: "Chat history and preferences live in your browser. Clearing site data removes them.",
  });
}
