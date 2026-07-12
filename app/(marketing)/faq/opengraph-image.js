import { ogImage, size, contentType } from "@/lib/og";
import { APP_NAME } from "@/lib/chatContract";

export { size, contentType };
export const alt = `${APP_NAME} frequently asked questions`;

export default function Image() {
  return ogImage({
    eyebrow: "Support",
    title: "Frequently asked questions",
    subtitle: "What it is, where the data comes from, how Incognito Mode works, and what it cannot tell you.",
  });
}
