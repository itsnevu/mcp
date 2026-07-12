import styles from "./docs.module.css";
import Link from "next/link";

export default function DocsLayout({ children }) {
  return (
    <div className={styles.docsContainer}>
      <aside className={styles.docsSidebar}>
        <div className={styles.sidebarSection}>
          <h4>Getting Started</h4>
          <ul>
            <li><Link href="/docs">Introduction</Link></li>
            <li><Link href="/docs#installation">Installation</Link></li>
          </ul>
        </div>
        <div className={styles.sidebarSection}>
          <h4>Guides</h4>
          <ul>
            <li><Link href="/docs#usage">Usage</Link></li>
            <li><Link href="/docs#api">API Reference</Link></li>
          </ul>
        </div>
      </aside>
      <div className={styles.docsContent}>
        {children}
      </div>
    </div>
  );
}
