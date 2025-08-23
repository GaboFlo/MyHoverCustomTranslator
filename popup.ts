// Types globaux utilisés
interface PopupTranslationData {
  [key: string]: string | PopupTranslationData;
}

interface PopupSettings {
  translations?: PopupTranslationData;
  targetUrls?: string[];
  isEnabled?: boolean;
  delay?: number;
  translationPartsCount?: number;
  siteSettings?: { [domain: string]: SiteSettings };
}

interface SiteSettings {
  highlightAllWords?: boolean;
}

interface PopupElements {
  siteStatusIndicator: HTMLSpanElement;
  openOptions: HTMLButtonElement;
  addCurrentSite: HTMLButtonElement;
  removeCurrentSite: HTMLButtonElement;
  currentSiteUrl: HTMLInputElement;
  highlightAllWords: HTMLInputElement;
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
      const result = (await chrome.storage.sync.get([
        "translations",
        "targetUrls",
        "isEnabled",
        "siteSettings",
      ])) as PopupSettings;

      const targetUrls = result.targetUrls || [];
      const isEnabled = result.isEnabled !== false;
      const siteSettings = result.siteSettings || {};

      await this.updateStatusDisplay(targetUrls, isEnabled, siteSettings);
    } catch (error) {
      console.error("Erreur lors du chargement du statut:", error);
    }
  }

  private async updateStatusDisplay(
    targetUrls: string[],
    isEnabled: boolean,
    siteSettings: { [domain: string]: SiteSettings }
  ): Promise<void> {
    try {
      // Récupérer l'URL de l'onglet actif
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

      // Afficher le domaine qui sera ajouté
      this.elements.currentSiteUrl.value = currentDomain;

      // Charger les paramètres du site actuel
      const currentSiteSettings = siteSettings[currentDomain] || {};
      this.elements.highlightAllWords.checked =
        currentSiteSettings.highlightAllWords || false;

      // Afficher le statut spécifique au site actuel
      if (isActiveOnCurrentSite) {
        this.elements.siteStatusIndicator.textContent = "Actif";
        this.elements.siteStatusIndicator.className = "status-indicator";
        this.elements.addCurrentSite.classList.remove("visible");
        this.elements.removeCurrentSite.classList.add("visible");
      } else {
        this.elements.siteStatusIndicator.textContent = "Inactif";
        this.elements.siteStatusIndicator.className =
          "status-indicator inactive";
        this.elements.addCurrentSite.classList.add("visible");
        this.elements.removeCurrentSite.classList.remove("visible");
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
    if (targetUrls.length === 0) return false; // Inactif si aucune URL spécifiée

    return targetUrls.some((url) => {
      if (url.startsWith("*://")) {
        const pattern = url.replace("*://", "");
        return currentDomain.includes(pattern);
      }
      // Correspondance exacte ou correspondance de domaine
      return (
        currentDomain === url ||
        currentDomain.endsWith(`.${url}`) ||
        currentDomain === url
      );
    });
  }

  private openOptions(): void {
    try {
      // Méthode 1 : API Chrome standard
      if (chrome?.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        // Méthode 2 : Fallback avec getURL
        const optionsUrl = chrome.runtime.getURL("options.html");
        window.open(optionsUrl, "_blank");
      }
    } catch (error) {
      console.error("Erreur lors de l'ouverture des options:", error);
      // Méthode 3 : Fallback direct
      try {
        window.open("options.html", "_blank");
      } catch (fallbackError) {
        console.error("Erreur fallback:", fallbackError);
        // Méthode 4 : Créer un nouvel onglet manuellement
        const newTab = window.open("", "_blank");
        if (newTab) {
          newTab.location.href = "options.html";
        }
      }
    }
  }

  private async addCurrentSite(): Promise<void> {
    try {
      // Utiliser le domaine du champ de texte
      const domain = this.elements.currentSiteUrl.value.trim();

      if (!domain) {
        this.showNotification("Veuillez saisir un domaine valide");
        return;
      }

      // Récupérer les URLs actuelles
      const result = (await chrome.storage.sync.get(["targetUrls"])) as {
        targetUrls?: string[];
      };
      const currentUrls = result.targetUrls || [];

      // Ajouter le domaine actuel s'il n'est pas déjà présent
      if (!currentUrls.includes(domain)) {
        const newUrls = [...currentUrls, domain];
        await chrome.storage.sync.set({ targetUrls: newUrls });

        this.showNotification(
          `Site ${domain} ajouté aux URLs ciblées`,
          "success"
        );
        this.loadStatus(); // Recharger l'affichage

        // Recharger l'onglet actuel pour que l'extension prenne en compte le nouveau site
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
      // Utiliser le domaine du champ de texte
      const domain = this.elements.currentSiteUrl.value.trim();

      if (!domain) {
        this.showNotification("Veuillez saisir un domaine valide");
        return;
      }

      // Récupérer les URLs actuelles
      const result = (await chrome.storage.sync.get(["targetUrls"])) as {
        targetUrls?: string[];
      };
      const currentUrls = result.targetUrls || [];

      // Retirer le domaine actuel s'il est présent
      if (currentUrls.includes(domain)) {
        const newUrls = currentUrls.filter((url) => url !== domain);
        await chrome.storage.sync.set({ targetUrls: newUrls });

        this.showNotification(
          `Site ${domain} retiré des URLs ciblées`,
          "success"
        );
        this.loadStatus(); // Recharger l'affichage

        // Recharger l'onglet actuel pour que l'extension prenne en compte le changement
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
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;

    const backgroundColor = type === "success" ? "#28a745" : "#fd7e14";

    notification.style.cssText = `
       position: fixed;
       top: 10px;
       right: 10px;
       background: ${backgroundColor};
       color: white;
       padding: 8px 12px;
       border-radius: 6px;
       font-size: 12px;
       z-index: 10000;
       opacity: 0;
       transition: opacity 0.3s ease;
     `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = "1";
    }, 100);

    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }

  private async updateSiteSettings(): Promise<void> {
    try {
      const domain = this.elements.currentSiteUrl.value.trim();
      if (!domain) return;

      // Récupérer les paramètres actuels
      const result = (await chrome.storage.sync.get(["siteSettings"])) as {
        siteSettings?: { [domain: string]: SiteSettings };
      };
      const siteSettings = result.siteSettings || {};

      // Mettre à jour les paramètres pour ce site
      siteSettings[domain] ??= {};
      siteSettings[domain].highlightAllWords =
        this.elements.highlightAllWords.checked;

      // Sauvegarder
      await chrome.storage.sync.set({ siteSettings });

      // Recharger l'onglet actuel pour appliquer les changements
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
