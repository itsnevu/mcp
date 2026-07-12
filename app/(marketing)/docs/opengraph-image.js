import { ogImage, size, contentType } from "@/lib/og";
import { APP_NAME } from "@/lib/chatContract";

export { size, contentType };
export const alt = `${APP_NAME} developer documentation`;

export default function Image() {
  return ogImage({
    eyebrow: "Developers",
    title: "Documentation",
    subtitle: "Setup, the HTTP API, live RobinX engine + RobinX MCP mode, and the on-chain agent surface.",
  });
}
