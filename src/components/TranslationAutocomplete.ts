import { DomUtils } from "../utils/dom";

interface AutocompleteElements {
  searchInput: HTMLInputElement;
  suggestionsList: HTMLDivElement;
  container: HTMLElement;
}

interface AutocompleteCallbacks {
  onSelect?: (key: string, value: string) => void;
  onEdit?: (key: string, value: string) => void;
  onDelete?: (key: string) => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export class TranslationAutocomplete {
  private elements!: AutocompleteElements;
  private readonly callbacks: AutocompleteCallbacks;
  private allTranslations: Record<string, string> = {};
  private filteredSuggestions: Array<{ key: string; value: string }> = [];

  constructor(containerId: string, callbacks: AutocompleteCallbacks = {}) {
    this.callbacks = callbacks;
    this.createAutocomplete(containerId);
    this.bindEvents();
    this.loadTranslations();
  }

  private createAutocomplete(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container avec l'ID "${containerId}" non trouvé`);
    }

    DomUtils.setElementHtml(
      container,
      `
      <div class="translation-autocomplete">
        <div class="autocomplete-search">
          <input type="text" id="autocompleteSearch_${DomUtils.sanitizeHtml(
            containerId
          )}" placeholder="Rechercher une traduction..." class="form-input">
          <div id="autocompleteSuggestions_${DomUtils.sanitizeHtml(
            containerId
          )}" class="autocomplete-suggestions"></div>
        </div>
      </div>
    `
    );

    this.elements = {
      searchInput: document.getElementById(
        `autocompleteSearch_${DomUtils.sanitizeHtml(containerId)}`
      ) as HTMLInputElement,
      suggestionsList: document.getElementById(
        `autocompleteSuggestions_${DomUtils.sanitizeHtml(containerId)}`
      ) as HTMLDivElement,
      container: container,
    };
  }

  private bindEvents(): void {
    this.elements.searchInput.addEventListener("input", () => {
      this.handleSearch();
    });

    this.elements.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hideSuggestions();
      }
    });

    document.addEventListener("click", (e) => {
      if (!this.elements.container.contains(e.target as HTMLElement)) {
        this.hideSuggestions();
      }
    });
  }

  private async loadTranslations(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get([
        "translations",
        "translationPartsCount",
      ]);

      let translations: Record<string, string> = {};
      const translationPartsCount = result["translationPartsCount"] || 0;

      if (translationPartsCount > 0) {
        const partKeys = Array.from(
          { length: translationPartsCount },
          (_, i) => `translationPart_${i}`
        );
        const parts = await chrome.storage.sync.get(partKeys);

        for (let i = 0; i < translationPartsCount; i++) {
          const partKey = `translationPart_${i}`;
          if (parts[partKey]) {
            translations = { ...translations, ...parts[partKey] };
          }
        }
      } else {
        translations = result["translations"] || {};
      }

      this.allTranslations = translations;
    } catch (error) {
      console.error("Erreur lors du chargement des traductions:", error);
    }
  }

  private handleSearch(): void {
    const searchTerm = this.elements.searchInput.value.trim().toLowerCase();

    if (searchTerm.length < 2) {
      this.hideSuggestions();
      return;
    }

    this.filteredSuggestions = Object.entries(this.allTranslations)
      .filter(
        ([key, value]) =>
          key.toLowerCase().includes(searchTerm) ||
          value.toLowerCase().includes(searchTerm)
      )
      .map(([key, value]) => ({ key, value }))
      .slice(0, 10);

    this.showSuggestions();
  }

  private showSuggestions(): void {
    if (this.filteredSuggestions.length === 0) {
      this.hideSuggestions();
      return;
    }

    DomUtils.setElementHtml(
      this.elements.suggestionsList,
      this.filteredSuggestions
        .map(
          ({ key, value }) => `
        <div class="suggestion-item" data-key="${DomUtils.sanitizeHtml(
          key
        )}" data-value="${DomUtils.sanitizeHtml(value)}">
          <div class="suggestion-content">
            <div class="suggestion-key">${this.highlightMatch(
              key,
              this.elements.searchInput.value
            )}</div>
            <div class="suggestion-value">${this.highlightMatch(
              value,
              this.elements.searchInput.value
            )}</div>
          </div>
          <div class="suggestion-actions">
            <button class="btn btn-secondary suggestion-edit" title="Modifier">✏️</button>
            <button class="btn btn-danger suggestion-delete" title="Supprimer">🗑️</button>
          </div>
        </div>
      `
        )
        .join("")
    );

    this.elements.suggestionsList.style.display = "block";

    this.elements.suggestionsList
      .querySelectorAll(".suggestion-edit")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const item = (btn as HTMLElement).closest(
            ".suggestion-item"
          ) as HTMLElement;
          const key = item.dataset["key"] || "";
          const value = item.dataset["value"] || "";
          this.handleEdit(key, value);
        });
      });

    this.elements.suggestionsList
      .querySelectorAll(".suggestion-delete")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const item = (btn as HTMLElement).closest(
            ".suggestion-item"
          ) as HTMLElement;
          const key = item.dataset["key"] || "";
          this.handleDelete(key);
        });
      });
  }

  private highlightMatch(text: string, searchTerm: string): string {
    if (!searchTerm) return text;
    const regex = new RegExp(
      `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    return text.replace(regex, "<mark>$1</mark>");
  }

  private hideSuggestions(): void {
    this.elements.suggestionsList.style.display = "none";
  }

  private handleEdit(key: string, value: string): void {
    this.hideSuggestions();
    this.elements.searchInput.value = "";

    if (this.callbacks.onEdit) {
      this.callbacks.onEdit(key, value);
    }
  }

  private async handleDelete(key: string): Promise<void> {
    if (
      !confirm(`Êtes-vous sûr de vouloir supprimer la traduction "${key}" ?`)
    ) {
      return;
    }

    try {
      if (this.callbacks.onDelete) {
        await this.callbacks.onDelete(key);
      } else {
        delete this.allTranslations[key];
        await this.updateStorage();
      }

      this.hideSuggestions();
      this.elements.searchInput.value = "";
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      const message = "Erreur lors de la suppression de la traduction";
      this.callbacks.onError?.(message);
    }
  }

  private async updateStorage(): Promise<void> {
    const result = await chrome.storage.sync.get(["translationPartsCount"]);
    const translationPartsCount = result["translationPartsCount"] || 0;

    if (translationPartsCount > 0) {
      const entries = Object.entries(this.allTranslations);
      const chunkSize = 1000;
      const newPartsCount = Math.ceil(entries.length / chunkSize);

      for (let i = 0; i < newPartsCount; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        const part = Object.fromEntries(entries.slice(start, end));
        await chrome.storage.sync.set({ [`translationPart_${i}`]: part });
      }

      await chrome.storage.sync.set({ translationPartsCount: newPartsCount });
    } else {
      await chrome.storage.sync.set({ translations: this.allTranslations });
    }
  }

  public refresh(): void {
    this.loadTranslations();
  }

  public updateFromJson(jsonText: string): void {
    try {
      if (jsonText.trim()) {
        this.allTranslations = JSON.parse(jsonText);
      } else {
        this.allTranslations = {};
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour depuis le JSON:", error);
    }
  }

  public focus(): void {
    this.elements.searchInput.focus();
  }
}
