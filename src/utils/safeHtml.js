/**
 * Untrusted-HTML boundary.
 *
 * Anything that isn't produced by our own TipTap schema — legacy HTML entries,
 * Gemini "Stoic Rewrite" output, pasted content — must pass through here before
 * it reaches the DOM. Setting innerHTML on a detached <div> is NOT safe:
 * `<img src=x onerror=…>` still executes in the page's origin.
 */
import DOMPurify from "dompurify";

const CONFIG = {
  USE_PROFILES: { html: true },
  // TipTap YouTube embeds
  ADD_TAGS: ["iframe"],
  ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "target", "data-type", "data-checked"],
};

// Only allow YouTube iframes; strip every other frame source
DOMPurify.addHook("uponSanitizeElement", (node, data) => {
  if (data.tagName === "iframe") {
    const src = node.getAttribute("src") || "";
    if (!/^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//.test(src)) {
      node.remove();
    }
  }
});

// Links opened in a new tab can't reach back into the app
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

/** Sanitised HTML string, safe for dangerouslySetInnerHTML. */
export const sanitizeHtml = (html) =>
  typeof html === "string" ? DOMPurify.sanitize(html, CONFIG) : "";

/**
 * Plain text of an HTML string without executing anything: DOMParser builds an
 * inert document (no scripts, no event handlers, no resource loads).
 */
export const htmlToText = (html) => {
  if (typeof html !== "string" || !html) return "";
  const parsed = new DOMParser().parseFromString(html, "text/html");
  return parsed.body.textContent || "";
};
