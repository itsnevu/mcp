import { ogImage, size, contentType } from "@/lib/og";

export { size, contentType };
export const alt = "Terms of use";

export default function Image() {
  return ogImage({
    eyebrow: "Legal",
    title: "Terms of use",
    subtitle: "A prototype research interface. Not financial, legal, tax, or investment advice.",
  });
}
