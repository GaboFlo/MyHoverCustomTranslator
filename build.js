import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import process from "process";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const build = () => {
  const filesToCopy = [
    "manifest.json",
    "styles.css",
    "options.html",
    "options.css",
    "popup.html",
    "popup.css",
    "translation-form.css",
    "example-config.json",
    "README.md",
    "LICENSE",
    ".gitignore",
  ];

  const dirsToCopy = ["icons"];

  console.log("🔨 Début du build...");

  if (!fs.existsSync("dist")) {
    fs.mkdirSync("dist");
    console.log("📁 Dossier dist créé");
  }

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
