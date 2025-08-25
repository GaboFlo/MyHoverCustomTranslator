/**
 * Background script pour l'extension de traduction au survol
 */

// Gestionnaire d'installation de l'extension
chrome.runtime.onInstalled.addListener((): void => {
  console.log("🔤 Extension de traduction au survol installée");
});
