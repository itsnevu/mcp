import { ogImage, size, contentType } from "@/lib/og";
import { ARTICLES, getArticle } from "@/lib/articles";

export { size, contentType };
export const alt = "Bugglo Research Group";

/* One OG image per post, prerendered from the same article data as the page. */
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export default function Image({ params }) {
  const article = getArticle(params.slug);
  return ogImage({
    eyebrow: "Bugglo Research Group",
    title: article ? article.title : "Research & security writing",
    subtitle: article ? `${article.readTime} read` : "Field notes on Robinhood Chain security.",
  });
}
