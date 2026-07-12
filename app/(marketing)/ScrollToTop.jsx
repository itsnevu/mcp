"use client";

import { useEffect, useState } from "react";
import styles from "./marketing.module.css";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // We are scrolling in the page container or window?
    // Marketing Layout uses .page class on a div that is overflow-y: auto.
    const pageContainer = document.querySelector(`.${styles.page}`);
    if (!pageContainer) return;

    const toggleVisibility = () => {
      if (pageContainer.scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    pageContainer.addEventListener("scroll", toggleVisibility);
    return () => pageContainer.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    const pageContainer = document.querySelector(`.${styles.page}`);
    if (pageContainer) {
      pageContainer.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button onClick={scrollToTop} className={styles.scrollToTopBtn} aria-label="Scroll to top">
      ↑
    </button>
  );
}
