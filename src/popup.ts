import { DomUtils } from "./utils/dom";
import { StorageManager } from "./utils/storage";

interface PopupElements {
  siteStatusIndicator: HTMLSpanElement;
  openOptions: HTMLButtonElement;
  addCurrentSite: HTMLButtonElement;
  removeCurrentSite: HTMLButtonElement;
  currentSiteUrl: HTMLInputElement;
  highlightAllWords: HTMLInputElement;
  infoSection: HTMLDivElement;
  siteOptionsSection: HTMLDivElement;
}

class PopupManager {
  private elements: PopupElements;

  constructor() {
    this.elements = {} as PopupElements;
    this.init();
  }

  private init(): void {
    this.cacheElements();
    this.bindEvents();
    this.loadStatus();
    this.updateVersion();
  }

  private cacheElements(): void {
    this.elements = {
      siteStatusIndicator: document.getElementById(
        "siteStatusIndicator"
      ) as HTMLSpanElement,
      openOptions: document.getElementById("openOptions") as HTMLButtonElement,
      addCurrentSite: document.getElementById(
        "addCurrentSite"
      ) as HTMLButtonElement,
      removeCurrentSite: document.getElementById(
        "removeCurrentSite"
      ) as HTMLButtonElement,
      currentSiteUrl: document.getElementById(
        "currentSiteUrl"
      ) as HTMLInputElement,
      highlightAllWords: document.getElementById(
        "highlightAllWords"
      ) as HTMLInputElement,
      infoSection: document.getElementById("infoSection") as HTMLDivElement,
      siteOptionsSection: document.getElementById(
        "siteOptionsSection"
      ) as HTMLDivElement,
    };
  }

  private bindEvents(): void {
    try {
      this.elements.openOptions.addEventListener("click", () => {
        this.openOptions();
      });

      this.elements.addCurrentSite.addEventListener("click", () => {
        this.addCurrentSite();
      });

      this.elements.removeCurrentSite.addEventListener("click", () => {
        this.removeCurrentSite();
      });

      this.elements.highlightAllWords.addEventListener("change", () => {
        this.updateSiteSettings();
      });
    } catch (error) {
      console.error(
        "❌ Erreur lors de la liaison des événements popup:",
        error
      );
    }
  }

  private async loadStatus(): Promise<void> {
    try {
      const settings = await StorageManager.loadSettings();
      const targetUrls = settings.targetUrls || [];
      const isEnabled = settings.isEnabled !== false;
      const siteSettings = settings.siteSettings || {};

      await this.updateStatusDisplay(targetUrls, isEnabled, siteSettings);
    } catch (error) {
      console.error("Erreur lors du chargement du statut:", error);
    }
  }

  private async updateStatusDisplay(
    targetUrls: string[],
    isEnabled: boolean,
    siteSettings: Record<string, { highlightAllWords?: boolean }>
  ): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs[0];

      let currentDomain = "";
      if (activeTab?.url) {
        currentDomain = new URL(activeTab.url).hostname;
      }

      const isActiveOnCurrentSite = this.isExtensionActiveOnSite(
        currentDomain,
        targetUrls,
        isEnabled
      );

      this.elements.currentSiteUrl.value = currentDomain;

      const currentSiteSettings = siteSettings[currentDomain] || {};
      this.elements.highlightAllWords.checked =
        currentSiteSettings.highlightAllWords || false;

      if (isActiveOnCurrentSite) {
        this.elements.siteStatusIndicator.textContent = "Actif";
        this.elements.siteStatusIndicator.className = "status-indicator";
        this.elements.addCurrentSite.classList.remove("visible");
        this.elements.removeCurrentSite.classList.add("visible");
        this.elements.infoSection.style.display = "block";
        this.elements.siteOptionsSection.style.display = "block";
      } else {
        this.elements.siteStatusIndicator.textContent = "Inactif";
        this.elements.siteStatusIndicator.className =
          "status-indicator inactive";
        this.elements.addCurrentSite.classList.add("visible");
        this.elements.removeCurrentSite.classList.remove("visible");
        this.elements.infoSection.style.display = "none";
        this.elements.siteOptionsSection.style.display = "none";
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'affichage:", error);
    }
  }

  private isExtensionActiveOnSite(
    currentDomain: string,
    targetUrls: string[],
    isEnabled: boolean
  ): boolean {
    if (!isEnabled) return false;
    if (targetUrls.length === 0) return false;

    return targetUrls.some((url) => {
      if (url.startsWith("*://")) {
        const pattern = url.replace("*://", "");
        return currentDomain.includes(pattern);
      }
      return (
        currentDomain === url ||
        currentDomain.endsWith(`.${url}`) ||
        currentDomain === url
      );
    });
  }

  private openOptions(): void {
    try {
      if (chrome?.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        const optionsUrl = chrome.runtime.getURL("options.html");
        window.open(optionsUrl, "_blank");
      }
    } catch (error) {
      console.error("Erreur lors de l'ouverture des options:", error);
      try {
        window.open("options.html", "_blank");
      } catch (fallbackError) {
        console.error("Erreur fallback:", fallbackError);
        const newTab = window.open("", "_blank");
        if (newTab) {
          newTab.location.href = "options.html";
        }
      }
    }
  }

  private async addCurrentSite(): Promise<void> {
    try {
      const domain = this.elements.currentSiteUrl.value.trim();

      if (!domain) {
        this.showNotification("Veuillez saisir un domaine valide");
        return;
      }

      const result = await chrome.storage.sync.get(["targetUrls"]);
      const currentUrls = result["targetUrls"] || [];

      if (!currentUrls.includes(domain)) {
        const newUrls = [...currentUrls, domain];
        await chrome.storage.sync.set({ targetUrls: newUrls });

        this.showNotification(
          `Site ${domain} ajouté aux URLs ciblées`,
          "success"
        );
        this.loadStatus();

        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const activeTab = tabs[0];
        if (activeTab?.id) {
          await chrome.tabs.reload(activeTab.id);
        }
      } else {
        this.showNotification(
          `Le site ${domain} est déjà dans la liste`,
          "error"
        );
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout du site:", error);
      this.showNotification("Erreur lors de l'ajout du site", "error");
    }
  }

  private async removeCurrentSite(): Promise<void> {
    try {
      const domain = this.elements.currentSiteUrl.value.trim();

      if (!domain) {
        this.showNotification("Veuillez saisir un domaine valide");
        return;
      }

      const result = await chrome.storage.sync.get(["targetUrls"]);
      const currentUrls = result["targetUrls"] || [];

      if (currentUrls.includes(domain)) {
        const newUrls = currentUrls.filter((url: string) => url !== domain);
        await chrome.storage.sync.set({ targetUrls: newUrls });

        this.showNotification(
          `Site ${domain} retiré des URLs ciblées`,
          "success"
        );
        this.loadStatus();

        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const activeTab = tabs[0];
        if (activeTab?.id) {
          await chrome.tabs.reload(activeTab.id);
        }
      } else {
        this.showNotification(
          `Le site ${domain} n'est pas dans la liste`,
          "error"
        );
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du site:", error);
      this.showNotification("Erreur lors de la suppression du site", "error");
    }
  }

  private showNotification(
    message: string,
    type: "success" | "error" = "success"
  ): void {
    DomUtils.createNotification({
      message,
      type,
      duration: 2000,
      position: "top-right",
    });
  }

  private async updateSiteSettings(): Promise<void> {
    try {
      const domain = this.elements.currentSiteUrl.value.trim();
      if (!domain) return;

      const result = await chrome.storage.sync.get(["siteSettings"]);
      const siteSettings = result["siteSettings"] || {};

      siteSettings[domain] ??= {};
      siteSettings[domain].highlightAllWords =
        this.elements.highlightAllWords.checked;

      await chrome.storage.sync.set({ siteSettings });

      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs[0];
      if (activeTab?.id) {
        await chrome.tabs.reload(activeTab.id);
      }

      this.showNotification(
        this.elements.highlightAllWords.checked
          ? "Surlignage automatique activé"
          : "Surlignage automatique désactivé"
      );
    } catch (error) {
      console.error("Erreur lors de la mise à jour des paramètres:", error);
      this.showNotification("Erreur lors de la mise à jour");
    }
  }

  private updateVersion(): void {
    try {
      const versionElement = document.getElementById("version");
      if (versionElement) {
        versionElement.textContent = chrome.runtime.getManifest().version;
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la version:", error);
    }
  }
}

// Gestionnaire d'erreurs global
window.addEventListener("error", (event) => {
  console.error("❌ Erreur JavaScript globale (popup):", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("❌ Promesse rejetée non gérée (popup):", event.reason);
});

document.addEventListener("DOMContentLoaded", () => {
  try {
    new PopupManager();
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation PopupManager:", error);
  }
});
