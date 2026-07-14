import { ogImage, size, contentType } from "@/lib/og";
import { CHAIN_NAME } from "@/lib/chatContract";

export { size, contentType };
export const alt = `Bugglo CLI — terminal rug checks for ${CHAIN_NAME}, with no account`;

export default function Image() {
  return ogImage({
    eyebrow: "The terminal",
    title: "Bugglo CLI",
    subtitle: `npx bugglo <address> — read ${CHAIN_NAME} straight from the chain. No key, no account, no backend.`,
  });
}
