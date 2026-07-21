import Link from "next/link";
import { APP_NAME, CHAIN_NAME } from "@/lib/chatContract";
import JsonLd from "@/components/JsonLd";
import { pageMetadata, webPageLd, breadcrumbLd, absoluteUrl } from "@/lib/seo";
import { ARTICLES } from "@/lib/articles";
import styles from "./blog.module.css";

const TITLE = "Research & security writing";
const DESCRIPTION = `Field notes from the ${APP_NAME} Research Group on ${CHAIN_NAME} security — honeypots, contract vulnerability vectors, pre-trade simulation, and how to read a token before you sign.`;

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/blog",
  keywords: [
    `${APP_NAME} blog`,
    "crypto security research",
    "honeypot detection",
    "smart contract vulnerabilities",
    "pre-trade simulation",
    "rug check",
    `${CHAIN_NAME} security`,
  ],
});

/* An ItemList of the posts is what lets a search engine understand /blog as an
   index page rather than a single article, and surface the individual posts. */
function blogListLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${absoluteUrl("/blog")}/#itemlist`,
    itemListElement: ARTICLES.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/blog/${a.slug}`),
      name: a.title,
    })),
  };
}

export default function BlogIndex() {
  return (
    <main className={styles.index}>
      <JsonLd
        data={[
          blogListLd(),
          webPageLd({ title: TITLE, description: DESCRIPTION, path: "/blog", type: "CollectionPage" }),
          breadcrumbLd([
            { name: APP_NAME, path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
        ]}
      />

      <header className={styles.indexHeader}>
        <h1>{TITLE}</h1>
        <p className={styles.indexLede}>{DESCRIPTION}</p>
      </header>

      <div className={styles.cardGrid}>
        {ARTICLES.map((a) => (
          <Link key={a.slug} href={`/blog/${a.slug}`} className={styles.card}>
            <div className={styles.cardMeta}>
              <span>reading time: {a.readTime}</span>
              <span>written by: {a.author}</span>
            </div>
            <h2 className={styles.cardTitle}>{a.title}</h2>
            <p className={styles.cardDek}>{a.dek}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
