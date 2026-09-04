import sanitizeHtml from "sanitize-html";

// Rich text is authored by admins but rendered to the public, so it must be
// sanitized to a safe allowlist before storage (defense against stored XSS).
export function sanitizeRichText(html: string): string {
  const clean = sanitizeHtml(html ?? "", {
    allowedTags: [
      "p", "br", "b", "i", "strong", "em", "u", "s",
      "ul", "ol", "li", "h3", "h4", "h5", "blockquote", "code", "pre",
      "a", "span", "hr",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" },
      }),
    },
  });
  return clean.slice(0, 100_000);
}

// Plain-text fallback (e.g., for hashing NDA content consistently).
export function htmlToText(html: string): string {
  return sanitizeHtml(html ?? "", { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
