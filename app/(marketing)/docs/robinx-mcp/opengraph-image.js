import { ogImage, size, contentType } from "@/lib/og";
import { CHAIN_NAME } from "@/lib/chatContract";

export { size, contentType };
export const alt = `RobinX MCP — on-chain tools for agentic AI on ${CHAIN_NAME}`;

export default function Image() {
  return ogImage({
    eyebrow: "The weapon",
    title: "RobinX MCP",
    subtitle: `The tool layer that lets an AI agent read, cross-examine, and act on ${CHAIN_NAME}.`,
  });
}
