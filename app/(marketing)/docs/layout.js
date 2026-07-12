import styles from "./docs.module.css";
import DocsNav from "./DocsNav";

export default function DocsLayout({ children }) {
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <DocsNav />
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
