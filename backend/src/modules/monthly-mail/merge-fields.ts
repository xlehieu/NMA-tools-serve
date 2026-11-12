import { DOMParser, XMLSerializer, type Document, type Element } from "@xmldom/xmldom";

const WORD = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const XML = "http://www.w3.org/XML/1998/namespace";

function elements(parent: Document | Element, name: string) {
  return Array.from(parent.getElementsByTagNameNS(WORD, name));
}

function fieldName(instruction: string) {
  const match = /^\s*MERGEFIELD\s+(?:"([^"]+)"|([^\s\\]+))/iu.exec(instruction);
  return match?.[1] ?? match?.[2];
}

export function mergeFields(source: string, valueFor: (name: string) => string) {
  const doc = new DOMParser().parseFromString(source, "application/xml");

  function replacement(format: Element | undefined, value: string) {
    const run = doc.createElementNS(WORD, "w:r");
    const style = format && elements(format, "rPr")[0];
    if (style) run.appendChild(style.cloneNode(true));
    for (const [index, line] of value.split(/\r\n?|\n/).entries()) {
      if (index) run.appendChild(doc.createElementNS(WORD, "w:br"));
      const text = doc.createElementNS(WORD, "w:t");
      text.setAttributeNS(XML, "xml:space", "preserve");
      text.appendChild(doc.createTextNode(line));
      run.appendChild(text);
    }
    return run;
  }

  for (const field of elements(doc, "fldSimple")) {
    const name = fieldName(field.getAttributeNS(WORD, "instr") ?? "");
    if (name) field.parentNode?.replaceChild(replacement(elements(field, "r")[0], valueFor(name)), field);
  }

  for (const paragraph of elements(doc, "p")) {
    const stack: { start: Element; instruction: string; separator?: Element; format?: Element }[] = [];
    for (const child of Array.from(paragraph.childNodes)) {
      if (child.nodeType !== 1 || child.namespaceURI !== WORD || child.localName !== "r") continue;
      const run = child as Element;
      const marker = elements(run, "fldChar")[0]?.getAttributeNS(WORD, "fldCharType");
      const field = stack.at(-1);
      if (marker === "begin") {
        stack.push({ start: run, instruction: "" });
      } else if (field && marker === "end") {
        stack.pop();
        const name = fieldName(field.instruction);
        if (!name) continue;
        paragraph.insertBefore(replacement(field.format ?? field.start, valueFor(name)), field.start);
        let node = field.start;
        while (node) {
          const next = node.nextSibling;
          paragraph.removeChild(node);
          if (node === run) break;
          node = next as Element;
        }
      } else if (field && marker === "separate") {
        field.separator = run;
      } else if (field?.separator) {
        field.format ??= run;
      } else if (field) {
        field.instruction += elements(run, "instrText").map((part) => part.textContent).join("");
      }
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

export function detachMailSource(source: string) {
  const doc = new DOMParser().parseFromString(source, "application/xml");
  for (const node of elements(doc, "mailMerge")) node.parentNode?.removeChild(node);
  return new XMLSerializer().serializeToString(doc);
}
