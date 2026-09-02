// ============================================================
// RICH TEXT UTILITIES
// ============================================================

const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "S",

  "H2",
  "H3",
  "H4",

  "UL",
  "OL",
  "LI",

  "BLOCKQUOTE",

  "A",

  "DIV",
  "SPAN",
]);

const ALLOWED_ALIGNMENTS = new Set(["left", "center", "right", "justify"]);

const sanitizeNode = (node, documentRef) => {
  // ==========================================================
  // TEXT NODE
  // ==========================================================

  if (node.nodeType === Node.TEXT_NODE) {
    return documentRef.createTextNode(node.textContent || "");
  }

  // ==========================================================
  // NON ELEMENT NODE
  // ==========================================================

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const tagName = String(node.tagName || "").toUpperCase();

  // ==========================================================
  // TAG KHÔNG ĐƯỢC PHÉP
  //
  // Không giữ chính tag đó nhưng vẫn giữ nội dung con.
  // ==========================================================

  if (!ALLOWED_TAGS.has(tagName)) {
    const fragment = documentRef.createDocumentFragment();

    Array.from(node.childNodes || []).forEach((child) => {
      const safeChild = sanitizeNode(child, documentRef);

      if (safeChild) {
        fragment.appendChild(safeChild);
      }
    });

    return fragment;
  }

  // ==========================================================
  // CREATE SAFE ELEMENT
  // ==========================================================

  const safeElement = documentRef.createElement(tagName.toLowerCase());

  // ==========================================================
  // LINK
  // ==========================================================

  if (tagName === "A") {
    const rawHref = String(node.getAttribute("href") || "").trim();

    const allowedHref =
      rawHref.startsWith("http://") ||
      rawHref.startsWith("https://") ||
      rawHref.startsWith("mailto:") ||
      rawHref.startsWith("tel:");

    if (allowedHref) {
      safeElement.setAttribute("href", rawHref);

      safeElement.setAttribute("target", "_blank");

      safeElement.setAttribute("rel", "noopener noreferrer");
    }
  }

  // ==========================================================
  // TEXT ALIGN
  // ==========================================================

  const alignment =
    String(node.style?.textAlign || "")
      .trim()
      .toLowerCase() || "";

  if (ALLOWED_ALIGNMENTS.has(alignment)) {
    safeElement.style.textAlign = alignment;
  }

  // ==========================================================
  // CHILDREN
  // ==========================================================

  Array.from(node.childNodes || []).forEach((child) => {
    const safeChild = sanitizeNode(child, documentRef);

    if (safeChild) {
      safeElement.appendChild(safeChild);
    }
  });

  return safeElement;
};

// ============================================================
// SANITIZE HTML
// ============================================================

export const sanitizeRichTextHtml = (html = "") => {
  const source = String(html || "").trim();

  if (!source) {
    return "";
  }

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return source;
  }

  const parser = new DOMParser();

  const parsed = parser.parseFromString(
    `<div id="rich-text-root">${source}</div>`,
    "text/html",
  );

  const root = parsed.getElementById("rich-text-root");

  if (!root) {
    return "";
  }

  const outputDocument = document.implementation.createHTMLDocument("");

  const outputRoot = outputDocument.createElement("div");

  Array.from(root.childNodes).forEach((child) => {
    const safeChild = sanitizeNode(child, outputDocument);

    if (safeChild) {
      outputRoot.appendChild(safeChild);
    }
  });

  return outputRoot.innerHTML;
};

// ============================================================
// EMPTY HTML
//
// Ví dụ:
//
// <p><br></p>
//
// về mặt nội dung vẫn được xem là trống.
// ============================================================

export const isRichTextEmpty = (html = "") => {
  const source = String(html || "");

  if (!source.trim()) {
    return true;
  }

  if (typeof document === "undefined") {
    return !source
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .trim();
  }

  const container = document.createElement("div");

  container.innerHTML = source;

  return !String(container.textContent || "")
    .replace(/\u00a0/g, " ")
    .trim();
};

// ============================================================
// PLAIN TEXT
// ============================================================

export const richTextToPlainText = (html = "") => {
  const source = String(html || "");

  if (!source) {
    return "";
  }

  if (typeof document === "undefined") {
    return source
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const container = document.createElement("div");

  container.innerHTML = sanitizeRichTextHtml(source);

  return String(container.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
};
