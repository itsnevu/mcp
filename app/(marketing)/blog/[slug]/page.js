import Link from "next/link";
import { notFound } from "next/navigation";
import { APP_NAME } from "@/lib/chatContract";
import JsonLd from "@/components/JsonLd";
import { pageMetadata, articleLd, webPageLd, breadcrumbLd } from "@/lib/seo";
import { ARTICLES, getArticle } from "@/lib/articles";
import styles from "../blog.module.css";

/* Every slug is known at build time, so the posts prerender as static HTML — the
   fastest thing to serve and the easiest thing for a crawler to read. */
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return pageMetadata({
    absoluteTitle: `${article.title} | ${APP_NAME}`,
    description: article.description,
    path: `/blog/${article.slug}`,
    keywords: article.keywords,
    type: "article",
    publishedTime: article.date,
    modifiedTime: article.date,
  });
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const path = `/blog/${article.slug}`;

  return (
    <article className={styles.article}>
      <JsonLd
        data={[
          articleLd({
            title: article.title,
            description: article.description,
            path,
            datePublished: article.date,
            image: `${path}/opengraph-image`,
            section: article.sections.map((s) => s.heading),
          }),
          webPageLd({ title: article.title, description: article.description, path }),
          breadcrumbLd([
            { name: APP_NAME, path: "/" },
            { name: "Blog", path: "/blog" },
            { name: article.title, path },
          ]),
        ]}
      />

      <Link href="/blog" className={styles.back}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        All articles
      </Link>

      <header className={styles.articleHeader}>
        <div className={styles.meta}>
          <span>reading time: {article.readTime}</span>
          <span>written by: {article.author}</span>
        </div>
        <h1>{article.title}</h1>
        <p className={styles.dek}>{article.dek}</p>
      </header>

      <div className={styles.body}>
        {article.sections.map((section) => (
          <section key={section.id} id={section.id}>
            <h2>{section.heading}</h2>
            {section.body.map((html, i) => (
              <div key={i} dangerouslySetInnerHTML={{ __html: html }} />
            ))}
          </section>
        ))}
      </div>

      <div className={styles.footerCta}>
        <Link href="/app">Run a rug check with {APP_NAME} →</Link>
      </div>
    </article>
  );
}
