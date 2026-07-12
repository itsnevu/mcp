import { ogImage, size, contentType } from "@/lib/og";
import { SITE_TITLE } from "@/lib/seo";
import { CHAIN_NAME } from "@/lib/chatContract";

export { size, contentType };
export const alt = SITE_TITLE;

export default function Image() {
  return ogImage({
    eyebrow: `Agentic AI for ${CHAIN_NAME}`,
    title: `Ask anything about ${CHAIN_NAME}`,
    subtitle: "An AI agent that plans, calls live on-chain tools, and answers with evidence — rug checks, deployer reputation, wallet analysis.",
  });
}
