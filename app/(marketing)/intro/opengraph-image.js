import { ogImage, size, contentType } from "@/lib/og";
import { APP_NAME } from "@/lib/chatContract";

export { size, contentType };
export const alt = `Introducing ${APP_NAME}`;

export default function Image() {
  return ogImage({
    eyebrow: "Product",
    title: `Introducing ${APP_NAME}`,
    subtitle: "It doesn't guess — it investigates, with live on-chain tools and verifiable evidence.",
  });
}
