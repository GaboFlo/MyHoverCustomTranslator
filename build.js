import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import process from "process";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const build = () => {
  const filesToCopy = [
    "styles.css",
    "options.html",
    "options.css",
    "popup.html",
    "popup.css",
    "translation-form.css",
    "example-config.json",
  ];

  const dirsToCopy = ["icons"];

  console.log("🔨 Début du build...");

  if (!fs.existsSync("dist")) {
    fs.mkdirSync("dist");
    console.log("📁 Dossier dist créé");
  }

  // Créer le manifest spécifique pour dist/
  const distManifest = {
    manifest_version: 3,
    name: "Traducteur personnalisé au survol",
    version: "0.0.1",
    description:
      "Extension de traduction au survol avec dictionnaire personnalisable",
    browser_specific_settings: {
      gecko: {
        id: "myhover-translator@gaboflo.fr",
      },
    },
    permissions: ["storage", "activeTab"],
    host_permissions: ["<all_urls>"],
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["content.js"],
        css: ["styles.css"],
        run_at: "document_end",
      },
    ],
    options_page: "options.html",
    icons: {
      16: "icons/icon16.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
    action: {
      default_popup: "popup.html",
      default_title: "Traducteur personnalisé au survol",
    },
  };

  // Écrire le manifest dans dist/
  fs.writeFileSync(
    path.join("dist", "manifest.json"),
    JSON.stringify(distManifest, null, 2)
  );
  console.log("📄 manifest.json créé pour dist/");

  filesToCopy.forEach((file) => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join("dist", file));
      console.log(`📄 ${file} copié`);
    }
  });

  dirsToCopy.forEach((dir) => {
    if (fs.existsSync(dir)) {
      const distDir = path.join("dist", dir);
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        const srcPath = path.join(dir, file);
        const destPath = path.join(distDir, file);
        fs.copyFileSync(srcPath, destPath);
        console.log(`📁 ${srcPath} copié`);
      });
    }
  });

  console.log("✅ Build terminé !");
  console.log("📦 Extension prête dans le dossier dist/");
};

// Compiler TypeScript d'abord
console.log("🔨 Compilation TypeScript...");
try {
  execSync("npx tsc", { stdio: "inherit" });
  console.log("✅ TypeScript compilé");
} catch (error) {
  console.error("❌ Erreur lors de la compilation TypeScript:", error);
  process.exit(1);
}

// Puis copier les fichiers
build();
