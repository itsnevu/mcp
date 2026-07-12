/* Structured data for crawlers. The payloads are built from our own constants, but
   escaping `<` is unconditional anyway: it is what stops a value that ever comes to
   contain "</script>" from closing this tag and turning data into markup. */
export default function JsonLd({ data }) {
  const graph = Array.isArray(data) ? data : [data];

  return (
    <>
      {graph.map((node, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(node).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
