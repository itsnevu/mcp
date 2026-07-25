import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    /* public/asset/ holds scraped third-party site material (see .gitignore) — it is not ours, it is
       not tracked, and linting a minified bundle only produces parse errors that mask real ones. */
    ignores: [".next/**", "node_modules/**", "coverage/**", "public/asset/**"],
  },
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
