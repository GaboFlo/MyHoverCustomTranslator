import type { TranslationData, TranslationMatch } from "../types";
import { DomUtils } from "../utils/dom";
import { TranslationUtils } from "../utils/translation";

export class AutoHighlighter {
  private highlightedElements: HTMLElement[] = [];
  private observer: MutationObserver | null = null;

  constructor() {
    this.observeContentChanges();
  }

  initializeAutoHighlighting(
    translations: Record<string, unknown>,
    siteSettings: Record<string, { highlightAllWords?: boolean }>,
    currentDomain: string
  ): void {
    const currentSiteSettings = siteSettings[currentDomain];
    if (!currentSiteSettings?.highlightAllWords) return;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.highlightAllKnownWords(translations);
      });
    } else {
      this.highlightAllKnownWords(translations);
    }
  }

  private observeContentChanges(): void {
    this.observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          shouldUpdate = true;
        }
      });

      if (shouldUpdate) {
        setTimeout(() => {
          this.highlightAllKnownWords(window.translations || {});
        }, 500);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private highlightAllKnownWords(translations: Record<string, unknown>): void {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (
            !parent ||
            parent.closest(
              "#hover-translator-search-overlay, #hover-translator-tooltip, [data-auto-highlighted]"
            ) ||
            parent.hasAttribute("data-auto-highlighted")
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const textNodes: Text[] = [];
    let node = walker.nextNode();
    while (node) {
      textNodes.push(node as Text);
      node = walker.nextNode();
    }

    textNodes.forEach((textNode) => {
      const text = textNode.textContent?.trim();
      if (!text || text.length < 2) return;

      const parentElement = textNode.parentElement;
      if (!parentElement || parentElement.hasAttribute("data-auto-highlighted"))
        return;

      const allTranslations = TranslationUtils.findAllTranslations(
        text,
        translations as TranslationData
      );

      if (allTranslations.length > 0) {
        this.autoHighlightElement(parentElement, text, allTranslations);
      }
    });
  }

  private autoHighlightElement(
    element: HTMLElement,
    fullText: string,
    allTranslations: TranslationMatch[]
  ): void {
    if (element.hasAttribute("data-auto-highlighted")) return;

    const originalContent = element.innerHTML;
    element.setAttribute("data-original-auto-content", originalContent);
    element.setAttribute("data-auto-highlighted", "true");

    let highlightedContent = fullText;

    const matchesToHighlight = allTranslations.map((translation, index) => {
      const colors = [
        { bg: "#ffeb3b80", text: "#000" },
        { bg: "#4caf5080", text: "#000" },
        { bg: "#ff980080", text: "#000" },
        { bg: "#e91e6380", text: "#fff" },
        { bg: "#9c27b080", text: "#fff" },
      ];
      const color = colors[index % colors.length] || colors[0];

      return {
        key: translation.matchedKey,
        isReverse: translation.isReverse,
        color: color,
        position: translation.position,
        translation: translation.translation,
      };
    });

    matchesToHighlight.sort((a, b) => a.position - b.position);

    matchesToHighlight.forEach((match) => {
      if (match.color) {
        const regex = new RegExp(`(${DomUtils.escapeRegExp(match.key)})`, "gi");

        highlightedContent = highlightedContent.replace(
          regex,
          `<span data-auto-highlight="true" style="background-color: ${match.color.bg}; color: ${match.color.text}; padding: 1px 2px; border-radius: 2px; cursor: pointer;" data-translation="${match.translation}" data-is-reverse="${match.isReverse}">$1</span>`
        );
      }
    });

    DomUtils.setElementHtml(element, highlightedContent);
    this.highlightedElements.push(element);

    this.addHighlightedSpansEvents(element);
  }

  private addHighlightedSpansEvents(element: HTMLElement): void {
    const highlightedSpans = element.querySelectorAll("[data-auto-highlight]");
    highlightedSpans.forEach((span) => {
      span.addEventListener(
        "mouseenter",
        (event) => {
          event.stopPropagation();
          this.showAutoHighlightTooltip(
            event as MouseEvent,
            span as HTMLElement
          );
        },
        true
      );
      span.addEventListener(
        "mouseleave",
        (event) => {
          event.stopPropagation();
          this.hideTooltip();
        },
        true
      );
    });
  }

  private showAutoHighlightTooltip(
    event: MouseEvent,
    element: HTMLElement
  ): void {
    const translation = element.getAttribute("data-translation");
    const isReverse = element.getAttribute("data-is-reverse") === "true";

    if (translation && window.tooltip) {
      const tooltipText = isReverse ? `⏪ ${translation}` : translation;
      window.tooltip.show(tooltipText, event);
    }
  }

  private hideTooltip(): void {
    if (window.tooltip) {
      window.tooltip.hide();
    }
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.highlightedElements.forEach((element) => {
      const originalContent = element.getAttribute(
        "data-original-auto-content"
      );
      if (originalContent) {
        DomUtils.setElementHtml(element, originalContent);
        element.removeAttribute("data-original-auto-content");
        element.removeAttribute("data-auto-highlighted");
      }
    });

    this.highlightedElements = [];
  }
}
