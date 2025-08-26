import { AutoHighlighter } from "./components/AutoHighlighter";
import { ClipboardManager } from "./components/ClipboardManager";
import { SearchOverlay } from "./components/SearchOverlay";
import { Tooltip } from "./components/Tooltip";
import type { TranslationData } from "./types";
import { DomUtils } from "./utils/dom";
import { StorageManager } from "./utils/storage";
import { TranslationUtils } from "./utils/translation";

declare global {
  interface Window {
    translations: Record<string, unknown>;
    tooltip: Tooltip;
  }
}

class HoverTranslator {
  private isEnabled = true;
  private translations: Record<string, unknown> = {};
  private targetUrls: string[] = [];
  private currentHoveredElement: HTMLElement | null = null;
  private siteSettings: Record<string, { highlightAllWords?: boolean }> = {};
  private currentDomain = "";

  private tooltip: Tooltip;
  private searchOverlay: SearchOverlay;
  private autoHighlighter: AutoHighlighter;

  constructor() {
    this.tooltip = new Tooltip();
    this.searchOverlay = new SearchOverlay();
    this.autoHighlighter = new AutoHighlighter();

    window.tooltip = this.tooltip;
    window.translations = this.translations;

    this.init();
  }

  private async init(): Promise<void> {
    await this.loadSettings();
    this.bindEvents();
    this.observePageChanges();
    this.initializeAutoHighlighting();
  }

  private async loadSettings(): Promise<void> {
    try {
      const settings = await StorageManager.loadSettings();
      this.translations = settings.translations || {};
      this.targetUrls = settings.targetUrls || [];
      this.isEnabled = settings.isEnabled !== false;
      this.siteSettings = settings.siteSettings || {};
      this.currentDomain = window.location.hostname;

      window.translations = this.translations;
    } catch (error) {
      console.error("❌ Erreur lors du chargement des paramètres:", error);
    }
  }

  private bindEvents(): void {
    document.addEventListener("mouseover", this.handleMouseOver.bind(this));
    document.addEventListener("mouseout", this.handleMouseOut.bind(this));
    document.addEventListener("mousemove", this.handleMouseMove.bind(this));
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    document.addEventListener("click", this.handleClick.bind(this));

    chrome.runtime.onMessage.addListener(
      this.handleBackgroundMessage.bind(this)
    );
  }

  private observePageChanges(): void {
    const observer = new MutationObserver(() => {
      if (
        this.tooltip &&
        !document.body.contains(this.tooltip as unknown as HTMLElement)
      ) {
        document.body.appendChild(this.tooltip as unknown as HTMLElement);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private handleMouseOver(event: MouseEvent): void {
    if (
      !this.isEnabled ||
      !TranslationUtils.shouldTranslateOnPage(this.targetUrls)
    ) {
      return;
    }

    const target = event.target as Element;

    if (
      target.hasAttribute("data-hover-translator-highlight") ||
      target.hasAttribute("data-auto-highlight") ||
      target.closest("[data-hover-translator-highlight]") ||
      target.closest("[data-auto-highlight]") ||
      target.closest("[data-hover-translator-border]")
    ) {
      return;
    }

    const text = DomUtils.getTextFromElement(target);
    if (!text || text.length < 2) return;

    const allTranslations = TranslationUtils.findAllTranslations(
      text,
      this.translations as TranslationData
    );
    if (allTranslations.length > 0) {
      this.removeTranslationBorder();
      this.addMultipleTranslationBorders(target, text, allTranslations);
      const tooltipText =
        TranslationUtils.formatMultipleTranslations(allTranslations);
      this.tooltip.show(tooltipText, event);
    }
  }

  private handleMouseOut(event: MouseEvent): void {
    const target = event.target as Element;

    if (
      target.hasAttribute("data-hover-translator-highlight") ||
      target.hasAttribute("data-auto-highlight") ||
      target.closest("[data-hover-translator-highlight]") ||
      target.closest("[data-auto-highlight]") ||
      target.closest("[data-hover-translator-border]")
    ) {
      return;
    }

    this.tooltip.hide();
    this.removeTranslationBorder();
  }

  private handleMouseMove(event: MouseEvent): void {
    this.tooltip.updatePosition(event);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.shiftKey && event.key === "F") {
      if (!TranslationUtils.shouldTranslateOnPage(this.targetUrls)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.searchOverlay.show();
    }
  }

  private handleClick(event: MouseEvent): void {
    const target = event.target as Element;

    if (
      target.hasAttribute("data-auto-highlight") ||
      target.hasAttribute("data-hover-translator-highlight")
    ) {
      event.preventDefault();
      event.stopPropagation();

      const textToTranslate = target.textContent?.trim() || "";
      if (textToTranslate) {
        ClipboardManager.copyTranslationOnClick(
          textToTranslate,
          target as HTMLElement,
          this.translations
        );
      }
    }
  }

  private handleBackgroundMessage(): void {
    // Garder cette méthode pour la compatibilité future
  }

  private addMultipleTranslationBorders(
    element: Element,
    fullText: string,
    allTranslations: Array<{
      translation: string;
      matchedKey: string;
      isReverse: boolean;
      position: number;
    }>
  ): void {
    if (element.nodeType === Node.ELEMENT_NODE) {
      const el = element as HTMLElement;
      this.currentHoveredElement = el;

      el.style.outline = "2px solid #667eea";
      el.style.outlineOffset = "1px";
      el.style.borderRadius = "2px";
      el.setAttribute("data-hover-translator-border", "true");

      TranslationUtils.highlightMultipleMatchedTexts(
        el,
        fullText,
        allTranslations
      );
    }
  }

  private removeTranslationBorder(): void {
    if (this.currentHoveredElement) {
      this.currentHoveredElement.style.outline = "";
      this.currentHoveredElement.style.outlineOffset = "";
      this.currentHoveredElement.style.borderRadius = "";
      this.currentHoveredElement.removeAttribute(
        "data-hover-translator-border"
      );

      if (!this.currentHoveredElement.hasAttribute("data-auto-highlighted")) {
        const originalContent = this.currentHoveredElement.getAttribute(
          "data-original-content"
        );
        if (originalContent) {
          DomUtils.setElementHtml(this.currentHoveredElement, originalContent);
          this.currentHoveredElement.removeAttribute("data-original-content");
        }
      }

      this.currentHoveredElement = null;
    }

    const elementsWithBorder = document.querySelectorAll(
      "[data-hover-translator-border]:not([data-auto-highlighted])"
    );
    elementsWithBorder.forEach((element) => {
      const el = element as HTMLElement;
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.borderRadius = "";
      el.removeAttribute("data-hover-translator-border");

      const originalContent = el.getAttribute("data-original-content");
      if (originalContent) {
        DomUtils.setElementHtml(el, originalContent);
        el.removeAttribute("data-original-content");
      }
    });
  }

  private initializeAutoHighlighting(): void {
    this.autoHighlighter.initializeAutoHighlighting(
      this.translations,
      this.siteSettings,
      this.currentDomain
    );
  }

  destroy(): void {
    this.tooltip.destroy();
    this.searchOverlay.destroy();
    this.autoHighlighter.destroy();
  }
}

// Gestionnaire d'erreurs global
window.addEventListener("error", (event) => {
  console.error("❌ Erreur JavaScript globale (content):", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("❌ Promesse rejetée non gérée (content):", event.reason);
});

// Initialisation de l'extension
try {
  new HoverTranslator();
} catch (error) {
  console.error("❌ Erreur lors de l'initialisation HoverTranslator:", error);
}
