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
  private searchOverlay: HTMLDivElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private searchResults: HTMLElement[] = [];

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
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    `;
    document.body.appendChild(this.tooltip);
  }

  private bindEvents(): void {
    document.addEventListener("mouseover", this.handleMouseOver.bind(this));
    document.addEventListener("mouseout", this.handleMouseOut.bind(this));
    document.addEventListener("mousemove", this.handleMouseMove.bind(this));
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
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

    const allTranslations = this.findAllTranslations(text);

    if (allTranslations.length > 0) {
      // Retirer l'ancienne bordure et ajouter la nouvelle
      this.removeTranslationBorder();
      this.addMultipleTranslationBorders(target, text, allTranslations);

      // Afficher le tooltip avec toutes les traductions
      const tooltipText = this.formatMultipleTranslations(allTranslations);
      this.showTooltip(tooltipText, event);
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

  private handleKeyDown(event: KeyboardEvent): void {
    // Intercepter Ctrl+Shift+F pour notre recherche personnalisée
    if (event.ctrlKey && event.shiftKey && event.key === "F") {
      if (!this.shouldTranslateOnPage()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.showSearchOverlay();
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

  private findAllTranslations(text: string): Array<{
    translation: string;
    matchedKey: string;
    isReverse: boolean;
    position: number;
  }> {
    const normalizedText = text.toLowerCase().trim().replace(/\s+/g, " ");
    const allMatches: Array<{
      translation: string;
      matchedKey: string;
      isReverse: boolean;
      position: number;
    }> = [];

    const findInObject = (
      obj: ContentTranslationData,
      searchText: string
    ): void => {
      for (const [key, value] of Object.entries(obj)) {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, " ");

        // Correspondance exacte clé -> valeur
        if (normalizedKey === searchText) {
          const position = searchText.indexOf(normalizedKey);
          allMatches.push({
            translation:
              typeof value === "string" ? value : JSON.stringify(value),
            matchedKey: key,
            isReverse: false,
            position: position >= 0 ? position : 0,
          });
        }

        // Correspondance exacte valeur -> clé
        if (typeof value === "string") {
          const normalizedValue = value
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");
          if (normalizedValue === searchText) {
            const position = searchText.indexOf(normalizedValue);
            allMatches.push({
              translation: key,
              matchedKey: value,
              isReverse: true,
              position: position >= 0 ? position : 0,
            });
          }
        }

        // Correspondance partielle clé -> valeur (le texte survolé contient la clé)
        if (searchText.includes(normalizedKey) && normalizedKey.length > 2) {
          const position = searchText.indexOf(normalizedKey);
          allMatches.push({
            translation:
              typeof value === "string" ? value : JSON.stringify(value),
            matchedKey: key,
            isReverse: false,
            position: position >= 0 ? position : 0,
          });
        }

        // Correspondance partielle valeur -> clé (le texte survolé contient la valeur)
        if (typeof value === "string") {
          const normalizedValue = value
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");
          if (
            searchText.includes(normalizedValue) &&
            normalizedValue.length > 2
          ) {
            const position = searchText.indexOf(normalizedValue);
            allMatches.push({
              translation: key,
              matchedKey: value,
              isReverse: true,
              position: position >= 0 ? position : 0,
            });
          }
        }

        if (typeof value === "object" && value !== null) {
          findInObject(value, searchText);
        }
      }
    };

    findInObject(this.translations, normalizedText);

    // Trier par position d'apparition dans le texte (ordre naturel)
    return allMatches.sort((a, b) => a.position - b.position);
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

      // Garder le soulignement général
      el.style.outline = "2px solid #667eea";
      el.style.outlineOffset = "1px";
      el.style.borderRadius = "2px";
      el.setAttribute("data-hover-translator-border", "true");

      // Ajouter le surlignage pour toutes les correspondances
      this.highlightMultipleMatchedTexts(el, fullText, allTranslations);
    }
  }

  private formatMultipleTranslations(
    allTranslations: Array<{
      translation: string;
      matchedKey: string;
      isReverse: boolean;
      position: number;
    }>
  ): string {
    if (allTranslations.length === 1 && allTranslations[0]) {
      const translation = allTranslations[0];
      return translation.isReverse
        ? `⏪ ${translation.translation}`
        : translation.translation;
    }

    // Grouper les traductions par type
    const normalTranslations = allTranslations.filter((t) => !t.isReverse);
    const reverseTranslations = allTranslations.filter((t) => t.isReverse);

    const parts: string[] = [];

    if (normalTranslations.length > 0) {
      parts.push(normalTranslations.map((t) => t.translation).join(" | "));
    }

    if (reverseTranslations.length > 0) {
      parts.push(
        `⏪ ${reverseTranslations.map((t) => t.translation).join(" | ")}`
      );
    }

    return parts.join(" | ");
  }

  private highlightMultipleMatchedTexts(
    element: HTMLElement,
    fullText: string,
    allTranslations: Array<{
      translation: string;
      matchedKey: string;
      isReverse: boolean;
      position: number;
    }>
  ): void {
    // Sauvegarder le contenu original
    const originalContent = element.innerHTML;

    let highlightedContent = fullText;

    // Créer un tableau de toutes les clés à surligner avec leurs couleurs
    const matchesToHighlight = allTranslations.map((translation, index) => {
      const colors = [
        { bg: "#ffeb3b", text: "#000" }, // Jaune
        { bg: "#4caf50", text: "#fff" }, // Vert
        { bg: "#ff9800", text: "#fff" }, // Orange
        { bg: "#e91e63", text: "#fff" }, // Rose
        { bg: "#9c27b0", text: "#fff" }, // Violet
      ];
      const color = colors[index % colors.length] || colors[0];

      return {
        key: translation.matchedKey,
        isReverse: translation.isReverse,
        color: color,
        position: translation.position,
      };
    });

    // Trier par position d'apparition dans le texte (ordre naturel)
    matchesToHighlight.sort((a, b) => a.position - b.position);

    // Appliquer les surlignages dans l'ordre d'apparition
    matchesToHighlight.forEach((match, index) => {
      if (match.color) {
        const regex = new RegExp(`(${this.escapeRegExp(match.key)})`, "gi");
        const reverseIndicator = match.isReverse ? "⏪ " : "";

        highlightedContent = highlightedContent.replace(
          regex,
          `<span data-hover-translator-highlight="true" style="background-color: ${
            match.color.bg
          }; color: ${
            match.color.text
          }; padding: 1px 2px; border-radius: 2px; font-weight: bold; pointer-events: none;" title="${reverseIndicator}Match ${
            index + 1
          }">$1</span>`
        );
      }
    });

    // Mettre à jour le contenu de l'élément
    element.innerHTML = highlightedContent;

    // Sauvegarder le contenu original pour pouvoir le restaurer
    element.setAttribute("data-original-content", originalContent);
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private showSearchOverlay(): void {
    // Créer l'overlay s'il n'existe pas
    if (!this.searchOverlay) {
      this.createSearchOverlay();
    }

    if (this.searchOverlay && this.searchInput) {
      this.searchOverlay.style.display = "block";
      this.searchInput.focus();
      this.searchInput.select();
    }
  }

  private createSearchOverlay(): void {
    this.searchOverlay = document.createElement("div");
    this.searchOverlay.id = "hover-translator-search-overlay";
    this.searchOverlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10001;
      display: none;
      pointer-events: auto;
    `;

    const searchBox = document.createElement("div");
    searchBox.style.cssText = `
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      padding: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.3);
      min-width: 250px;
      display: flex;
      align-items: center;
      gap: 6px;
    `;

    // Input de recherche
    this.searchInput = document.createElement("input");
    this.searchInput.type = "text";
    this.searchInput.placeholder = "Rechercher...";
    this.searchInput.style.cssText = `
      flex: 1;
      padding: 6px 10px;
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      font-size: 13px;
      outline: none;
      background: rgba(255, 255, 255, 0.9);
      color: #333;
    `;

    // Info résultats
    const resultsInfo = document.createElement("div");
    resultsInfo.id = "search-results-info";
    resultsInfo.style.cssText = `
      font-size: 11px;
      color: #666;
      min-width: 50px;
      text-align: center;
    `;

    // Bouton fermer
    const closeButton = document.createElement("button");
    closeButton.innerHTML = "❌";
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: 12px;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      opacity: 0.7;
      transition: opacity 0.2s;
    `;
    closeButton.title = "Fermer la recherche";
    closeButton.addEventListener("click", () => this.hideSearchOverlay());
    closeButton.addEventListener(
      "mouseenter",
      () => (closeButton.style.opacity = "1")
    );
    closeButton.addEventListener(
      "mouseleave",
      () => (closeButton.style.opacity = "0.7")
    );

    searchBox.appendChild(this.searchInput);
    searchBox.appendChild(resultsInfo);
    searchBox.appendChild(closeButton);
    this.searchOverlay.appendChild(searchBox);
    document.body.appendChild(this.searchOverlay);

    // Événements
    this.searchInput.addEventListener(
      "input",
      this.handleSearchInput.bind(this)
    );
  }

  private handleSearchInput(): void {
    if (!this.searchInput) return;

    const query = this.searchInput.value.trim();
    this.clearSearchResults();

    if (query.length < 2) {
      this.updateSearchResultsInfo("Tapez au moins 2 caractères");
      return;
    }

    this.performSearch(query);
  }

  private performSearch(query: string): void {
    const matches = this.findAllTranslationsInPage(query);

    if (matches.length === 0) {
      this.updateSearchResultsInfo("Aucun résultat trouvé");
      return;
    }

    this.highlightSearchResults(matches);

    // Faire défiler vers le premier résultat
    if (this.searchResults.length > 0) {
      const firstElement = this.searchResults[0];
      if (firstElement) {
        const firstResult = firstElement.querySelector(
          ".hover-translator-search-result"
        );
        if (firstResult) {
          firstResult.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }

    this.updateSearchResultsInfo(`${matches.length} résultat(s) trouvé(s)`);
  }

  private findAllTranslationsInPage(query: string): Array<{
    element: HTMLElement;
    text: string;
    translation: string;
    isReverse: boolean;
  }> {
    const matches: Array<{
      element: HTMLElement;
      text: string;
      translation: string;
      isReverse: boolean;
    }> = [];
    const normalizedQuery = query.toLowerCase().trim();

    // Parcourir tous les éléments de texte de la page
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (
            !parent ||
            parent.closest(
              "#hover-translator-search-overlay, #hover-translator-tooltip"
            )
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
      if (!parentElement) return;

      // Chercher des correspondances dans ce texte
      const allTranslations = this.findAllTranslations(text);

      allTranslations.forEach((translation) => {
        const keyLower = translation.matchedKey.toLowerCase();
        const translationLower = translation.translation.toLowerCase();

        // Vérifier si la requête correspond à la clé ou à la traduction
        if (
          keyLower.includes(normalizedQuery) ||
          translationLower.includes(normalizedQuery)
        ) {
          matches.push({
            element: parentElement,
            text: text,
            translation: translation.translation,
            isReverse: translation.isReverse,
          });
        }
      });
    });

    return matches;
  }

  private highlightSearchResults(
    matches: Array<{
      element: HTMLElement;
      text: string;
      translation: string;
      isReverse: boolean;
    }>
  ): void {
    this.searchResults = [];

    matches.forEach((match, index) => {
      const element = match.element;

      // Sauvegarder le contenu original
      const originalHTML = element.innerHTML;
      element.setAttribute("data-original-search-content", originalHTML);

      // Créer le surlignage avec la couleur du dictionnaire
      const highlightColor = match.isReverse ? "#ff9800" : "#4caf50"; // Orange pour les réciproques, Vert pour les normales
      const highlightText = match.isReverse ? "⏪ " : "";

      // Entourer le texte trouvé
      const newHTML = originalHTML.replace(
        new RegExp(`(${this.escapeRegExp(match.text)})`, "gi"),
        `<span class="hover-translator-search-result" data-search-index="${index}" style="background-color: ${highlightColor}; color: white; padding: 2px 4px; border-radius: 3px; font-weight: bold; border: 2px solid #333;" title="${highlightText}${match.translation}">$1</span>`
      );

      element.innerHTML = newHTML;

      // Ajouter l'élément à la liste des résultats
      this.searchResults.push(element);

      // Si c'est le premier résultat, le marquer comme actif
      if (index === 0) {
        const firstResult = element.querySelector(
          ".hover-translator-search-result"
        );
        if (firstResult) {
          firstResult.classList.add("active");
          (firstResult as HTMLElement).style.borderColor = "#f44336";
        }
      }
    });
  }

  private clearSearchResults(): void {
    // Restaurer le contenu original de tous les éléments modifiés
    document
      .querySelectorAll("[data-original-search-content]")
      .forEach((element) => {
        const original = element.getAttribute("data-original-search-content");
        if (original) {
          element.innerHTML = original;
          element.removeAttribute("data-original-search-content");
        }
      });

    this.searchResults = [];
  }

  private updateSearchResultsInfo(message: string): void {
    const info = document.getElementById("search-results-info");
    if (info) {
      // Format plus compact : "2/5" au lieu de "2 / 5 résultat(s)"
      if (message.includes("/")) {
        const match = message.match(/(\d+) \/ (\d+)/);
        if (match) {
          info.textContent = `${match[1]}/${match[2]}`;
          return;
        }
      }
      // Pour les autres messages, garder le texte mais plus court
      info.textContent = message
        .replace("résultat(s) trouvé(s)", "")
        .replace("Tapez au moins 2 caractères", "2+ car")
        .replace("Aucun résultat trouvé", "0");
    }
  }

  private hideSearchOverlay(): void {
    if (this.searchOverlay) {
      this.searchOverlay.style.display = "none";
      this.clearSearchResults();
      this.removeTranslationBorder();

      if (this.searchInput) {
        this.searchInput.value = "";
      }
    }
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
