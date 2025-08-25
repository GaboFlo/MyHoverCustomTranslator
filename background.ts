/**
 * Background script pour l'extension de traduction au survol
 *
 * Ce script gère :
 * - Les événements d'installation de l'extension
 * - La communication avec le content script
 */

// Gestionnaire d'installation de l'extension
chrome.runtime.onInstalled.addListener((): void => {
  console.log("🔤 Extension de traduction au survol installée");
});

// Écouter les messages du content script
chrome.runtime.onMessage.addListener((): void => {
  // Garder cette méthode pour la compatibilité future
});
