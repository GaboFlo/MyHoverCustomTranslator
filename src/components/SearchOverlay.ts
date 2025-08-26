import type { SearchMatch } from "../types";
import { DomUtils } from "../utils/dom";

export class SearchOverlay {
  private searchOverlay: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private searchResults: HTMLElement[] = [];

  constructor() {
    this.createSearchOverlay();
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

    const resultsInfo = document.createElement("div");
    resultsInfo.id = "search-results-info";
    resultsInfo.style.cssText = `
      font-size: 11px;
      color: #666;
      min-width: 50px;
      text-align: center;
    `;

    const closeButton = document.createElement("button");
    DomUtils.setElementContent(closeButton, "❌");
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
    closeButton.addEventListener("click", () => this.hide());

    searchBox.appendChild(this.searchInput);
    searchBox.appendChild(resultsInfo);
    searchBox.appendChild(closeButton);
    this.searchOverlay.appendChild(searchBox);
    document.body.appendChild(this.searchOverlay);

    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.searchInput) return;

    this.searchInput.addEventListener("input", () => {
      this.handleSearchInput();
    });
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

  private findAllTranslationsInPage(query: string): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const normalizedQuery = query.toLowerCase().trim();

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

      const allTranslations = this.findAllTranslations(text);

      allTranslations.forEach((translation) => {
        const keyLower = translation.matchedKey.toLowerCase();
        const translationLower = translation.translation.toLowerCase();

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

  private findAllTranslations(text: string): Array<{
    translation: string;
    matchedKey: string;
    isReverse: boolean;
  }> {
    const normalizedText = text.toLowerCase().trim().replace(/\s+/g, " ");
    const allMatches: Array<{
      translation: string;
      matchedKey: string;
      isReverse: boolean;
    }> = [];

    const findInObject = (
      obj: Record<string, unknown>,
      searchText: string
    ): void => {
      for (const [key, value] of Object.entries(obj)) {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, " ");

        if (normalizedKey === searchText) {
          allMatches.push({
            translation:
              typeof value === "string" ? value : JSON.stringify(value),
            matchedKey: key,
            isReverse: false,
          });
        }

        if (typeof value === "string") {
          const normalizedValue = value
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");
          if (normalizedValue === searchText) {
            allMatches.push({
              translation: key,
              matchedKey: value,
              isReverse: true,
            });
          }
        }

        if (typeof value === "object" && value !== null) {
          findInObject(value as Record<string, unknown>, searchText);
        }
      }
    };

    findInObject(window.translations || {}, normalizedText);
    return allMatches;
  }

  private highlightSearchResults(matches: SearchMatch[]): void {
    this.searchResults = [];

    matches.forEach((match, index) => {
      const element = match.element;

      const originalHTML = element.innerHTML;
      element.setAttribute("data-original-search-content", originalHTML);

      const highlightColor = match.isReverse ? "#ff9800" : "#4caf50";
      const highlightText = match.isReverse ? "⏪ " : "";

      const newHTML = originalHTML.replace(
        new RegExp(`(${DomUtils.escapeRegExp(match.text)})`, "gi"),
        `<span class="hover-translator-search-result" data-search-index="${index}" style="background-color: ${highlightColor}; color: white; padding: 2px 4px; border-radius: 3px; font-weight: bold; border: 2px solid #333;" title="${highlightText}${match.translation}">$1</span>`
      );

      DomUtils.setElementHtml(element, newHTML);
      this.searchResults.push(element);

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
    document
      .querySelectorAll("[data-original-search-content]")
      .forEach((element) => {
        const original = element.getAttribute("data-original-search-content");
        if (original && element instanceof HTMLElement) {
          DomUtils.setElementHtml(element, original);
          element.removeAttribute("data-original-search-content");
        }
      });

    this.searchResults = [];
  }

  private updateSearchResultsInfo(message: string): void {
    const info = document.getElementById("search-results-info");
    if (info) {
      if (message.includes("/")) {
        const match = message.match(/(\d+) \/ (\d+)/);
        if (match) {
          info.textContent = `${match[1]}/${match[2]}`;
          return;
        }
      }
      info.textContent = message
        .replace("résultat(s) trouvé(s)", "")
        .replace("Tapez au moins 2 caractères", "2+ car")
        .replace("Aucun résultat trouvé", "0");
    }
  }

  show(): void {
    if (!this.searchOverlay || !this.searchInput) return;

    this.searchOverlay.style.display = "block";
    this.searchInput.focus();
    this.searchInput.select();
  }

  hide(): void {
    if (!this.searchOverlay || !this.searchInput) return;

    this.searchOverlay.style.display = "none";
    this.clearSearchResults();
    this.searchInput.value = "";
  }

  destroy(): void {
    this.hide();
    if (this.searchOverlay && document.body.contains(this.searchOverlay)) {
      document.body.removeChild(this.searchOverlay);
    }
  }
}
