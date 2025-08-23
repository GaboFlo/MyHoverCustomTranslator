/* eslint-disable no-undef */
// Types utilisés
interface ContentTranslationData {
  [key: string]: string | ContentTranslationData;
}

interface ContentSettings {
  translations?: ContentTranslationData;
  targetUrls?: string[];
  isEnabled?: boolean;
  delay?: number;
  translationPartsCount?: number;
}

class HoverTranslator {
  private translations: ContentTranslationData = {};
  private targetUrls: string[] = [];
  private isEnabled: boolean = true;
  private tooltip: HTMLDivElement | null = null;
  private currentTimeout: number | null = null;
  private currentHoveredElement: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadSettings();
    this.createTooltip();
    this.bindEvents();
    this.observePageChanges();
  }

  private async loadSettings(): Promise<void> {
    try {
      const result = (await chrome.storage.sync.get([
        "translations",
        "targetUrls",
        "isEnabled",
        "delay",
        "translationPartsCount",
      ])) as ContentSettings;

      let translations: ContentTranslationData = {};

      // Vérifier s'il y a des parties de traduction
      if (result.translationPartsCount && result.translationPartsCount > 0) {
        // Charger toutes les parties
        const partKeys = Array.from(
          { length: result.translationPartsCount },
          (_, i) => `translationPart_${i}`
        );

        const parts = await chrome.storage.sync.get(partKeys);

        // Fusionner toutes les parties
        for (let i = 0; i < result.translationPartsCount; i++) {
          const partKey = `translationPart_${i}`;
          if (parts[partKey]) {
            translations = { ...translations, ...parts[partKey] };
          }
        }
      } else {
        translations = result.translations || {};
      }

      this.translations = translations;
      this.targetUrls = result.targetUrls || [];
      this.isEnabled = result.isEnabled !== false;
    } catch (error) {
      console.error("❌ Erreur lors du chargement des paramètres:", error);
    }
  }

  private createTooltip(): void {
    this.tooltip = document.createElement("div");
    this.tooltip.id = "hover-translator-tooltip";
    this.tooltip.style.cssText = `
      position: fixed;
      z-index: 10000;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      max-width: 300px;
      word-wrap: break-word;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    document.body.appendChild(this.tooltip);
  }

  private bindEvents(): void {
    document.addEventListener("mouseover", this.handleMouseOver.bind(this));
    document.addEventListener("mouseout", this.handleMouseOut.bind(this));
    document.addEventListener("mousemove", this.handleMouseMove.bind(this));
  }

  private observePageChanges(): void {
    const observer = new MutationObserver(() => {
      if (this.tooltip && !document.body.contains(this.tooltip)) {
        document.body.appendChild(this.tooltip);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private handleMouseOver(event: MouseEvent): void {
    if (!this.isEnabled) {
      return;
    }

    if (!this.shouldTranslateOnPage()) {
      return;
    }

    const target = event.target as Element;

    // Ignorer complètement les événements sur les éléments surlignés
    if (target.hasAttribute("data-hover-translator-highlight")) {
      return;
    }

    const text = this.getTextFromElement(target);

    if (!text || text.length < 2) {
      return;
    }

    const translationResult = this.findTranslation(text);

    if (translationResult) {
      // Retirer l'ancienne bordure et ajouter la nouvelle
      this.removeTranslationBorder();
      this.addTranslationBorder(target, text, translationResult.matchedKey);
      this.showTooltip(translationResult.translation, event);
    }
  }

  private handleMouseOut(event: MouseEvent): void {
    const target = event.target as Element;

    // Si on quitte un élément surligné, ne rien faire (garder le tooltip)
    if (target.hasAttribute("data-hover-translator-highlight")) {
      return;
    }

    this.hideTooltip();
    this.removeTranslationBorder();
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.tooltip && this.tooltip.style.opacity === "1") {
      this.positionTooltip(event);
    }
  }

  private getTextFromElement(element: Element): string | null {
    if (element.nodeType === Node.TEXT_NODE) {
      return element.textContent?.trim() || null;
    }

    if (element.nodeType === Node.ELEMENT_NODE) {
      const text = element.textContent?.trim();
      if (text && element.children.length === 0) {
        return text;
      }
    }

    return null;
  }

  private findTranslation(
    text: string
  ): { translation: string; matchedKey: string } | null {
    const normalizedText = text.toLowerCase().trim().replace(/\s+/g, " ");

    const findInObject = (
      obj: ContentTranslationData,
      searchText: string
    ): { translation: string; matchedKey: string } | null => {
      let partialMatch: {
        key: string;
        value: string | ContentTranslationData;
      } | null = null;

      for (const [key, value] of Object.entries(obj)) {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, " ");

        // Correspondance exacte (priorité)
        if (normalizedKey === searchText) {
          return {
            translation:
              typeof value === "string" ? value : JSON.stringify(value),
            matchedKey: key,
          };
        }

        // Correspondance partielle (le texte survolé contient la clé)
        if (searchText.includes(normalizedKey) && normalizedKey.length > 2) {
          if (!partialMatch || normalizedKey.length > partialMatch.key.length) {
            partialMatch = { key: normalizedKey, value };
          }
        }

        if (typeof value === "object" && value !== null) {
          const nestedResult = findInObject(
            value as ContentTranslationData,
            searchText
          );
          if (nestedResult) {
            return nestedResult;
          }
        }
      }

      // Si aucune correspondance exacte, retourner la meilleure correspondance partielle
      if (partialMatch) {
        return {
          translation:
            typeof partialMatch.value === "string"
              ? partialMatch.value
              : JSON.stringify(partialMatch.value),
          matchedKey: partialMatch.key,
        };
      }

      return null;
    };

    return findInObject(this.translations, normalizedText);
  }

  private shouldTranslateOnPage(): boolean {
    if (this.targetUrls.length === 0) {
      return true;
    }

    const currentUrl = window.location.href;
    const currentDomain = new URL(currentUrl).hostname;

    return this.targetUrls.some((url) => {
      if (url.startsWith("*://")) {
        const pattern = url.replace("*://", "");
        return currentDomain.includes(pattern);
      }
      return currentDomain === url || currentDomain.includes(url);
    });
  }

  private showTooltip(translation: string, event: MouseEvent): void {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
    }

    this.currentTimeout = window.setTimeout(() => {
      if (this.tooltip) {
        this.tooltip.textContent = translation;
        this.tooltip.style.opacity = "1";
        this.positionTooltip(event);
      }
    }, 300);
  }

  private hideTooltip(): void {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    if (this.tooltip) {
      this.tooltip.style.opacity = "0";
    }
  }

  private positionTooltip(event: MouseEvent): void {
    if (!this.tooltip) return;

    const rect = this.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Positionner directement sous le curseur
    let x = event.clientX;
    let y = event.clientY + 20; // 20px sous le curseur

    // Ajuster si le tooltip dépasse à droite
    if (x + rect.width > viewportWidth - 20) {
      x = event.clientX - rect.width;
    }

    // Ajuster si le tooltip dépasse en bas
    if (y + rect.height > viewportHeight - 20) {
      y = event.clientY - rect.height - 20; // Au-dessus du curseur
    }

    // S'assurer que le tooltip reste dans la vue
    if (x < 10) x = 10;
    if (y < 10) y = 10;

    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  private addTranslationBorder(
    element: Element,
    fullText: string,
    matchedKey: string
  ): void {
    if (element.nodeType === Node.ELEMENT_NODE) {
      const el = element as HTMLElement;
      this.currentHoveredElement = el;

      // Garder le soulignement général
      el.style.outline = "2px solid #667eea";
      el.style.outlineOffset = "1px";
      el.style.borderRadius = "2px";
      el.setAttribute("data-hover-translator-border", "true");

      // Ajouter le surlignage spécifique du texte correspondant
      this.highlightMatchedText(el, fullText, matchedKey);
    }
  }

  private highlightMatchedText(
    element: HTMLElement,
    fullText: string,
    matchedKey: string
  ): void {
    // Sauvegarder le contenu original
    const originalContent = element.innerHTML;

    // Créer une expression régulière pour trouver le texte correspondant (insensible à la casse)
    const regex = new RegExp(`(${this.escapeRegExp(matchedKey)})`, "gi");

    // Remplacer le texte correspondant par un span surligné avec un attribut spécial
    const highlightedContent = fullText.replace(
      regex,
      '<span data-hover-translator-highlight="true" style="background-color: #ffeb3b; color: #000; padding: 1px 2px; border-radius: 2px; font-weight: bold; pointer-events: none;">$1</span>'
    );

    // Mettre à jour le contenu de l'élément
    element.innerHTML = highlightedContent;

    // Sauvegarder le contenu original pour pouvoir le restaurer
    element.setAttribute("data-original-content", originalContent);
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private removeTranslationBorder(): void {
    // Retirer la bordure de l'élément actuellement survolé
    if (this.currentHoveredElement) {
      this.currentHoveredElement.style.outline = "";
      this.currentHoveredElement.style.outlineOffset = "";
      this.currentHoveredElement.style.borderRadius = "";
      this.currentHoveredElement.removeAttribute(
        "data-hover-translator-border"
      );

      // Restaurer le contenu original
      const originalContent = this.currentHoveredElement.getAttribute(
        "data-original-content"
      );
      if (originalContent) {
        this.currentHoveredElement.innerHTML = originalContent;
        this.currentHoveredElement.removeAttribute("data-original-content");
      }

      this.currentHoveredElement = null;
    }

    // Nettoyage de sécurité pour tous les éléments avec l'attribut
    const elementsWithBorder = document.querySelectorAll(
      "[data-hover-translator-border]"
    );
    elementsWithBorder.forEach((element) => {
      const el = element as HTMLElement;
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.borderRadius = "";
      el.removeAttribute("data-hover-translator-border");

      // Restaurer le contenu original
      const originalContent = el.getAttribute("data-original-content");
      if (originalContent) {
        el.innerHTML = originalContent;
        el.removeAttribute("data-original-content");
      }
    });
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
