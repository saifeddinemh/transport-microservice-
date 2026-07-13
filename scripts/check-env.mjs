#!/usr/bin/env node
/**
 * check-env.mjs
 * -----------------------------------------------------------------------
 * Contrôle de sécurité exécuté en CI (et utilisable en local / pre-commit) :
 *
 *  1. Vérifie qu'aucun fichier `.env` réel n'est suivi par git (jamais
 *     commité), pour éviter toute fuite de secrets.
 *  2. Vérifie que `.env.example` existe et documente bien toutes les
 *     variables requises par l'application (cf. schéma @fastify/env dans
 *     src/utils/createServer.ts).
 *  3. Si un `.env` local existe (poste développeur), vérifie qu'il ne lui
 *     manque aucune variable présente dans `.env.example`, pour éviter les
 *     démarrages en configuration incomplète.
 *
 * Ce script ne lit ni n'affiche jamais la valeur des secrets : seuls les
 * NOMS des variables sont comparés.
 * -----------------------------------------------------------------------
 */

import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const ENV_EXAMPLE_PATH = path.join(ROOT, ".env.example");
const ENV_PATH = path.join(ROOT, ".env");

// Variables strictement obligatoires pour que le serveur démarre
// (doit rester synchronisé avec le schema `fastifyEnv` dans createServer.ts).
const REQUIRED_VARS = ["DATABASE_URL", "JWT_SECRET", "PEPPER_SECRET_KEY"];

let hasError = false;
const fail = (message) => {
  console.error(`✖ ${message}`);
  hasError = true;
};
const ok = (message) => console.log(`✔ ${message}`);
const warn = (message) => console.warn(`⚠ ${message}`);

function parseEnvKeys(content) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=")[0]?.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------
// 1) `.env` ne doit jamais être suivi par git
// ---------------------------------------------------------------------
try {
  const tracked = execSync("git ls-files", { cwd: ROOT, encoding: "utf-8" })
    .split("\n")
    .filter(Boolean);

  const trackedEnvFiles = tracked
    .filter((f) => /(^|\/)\.env$/.test(f) || /(^|\/)\.env\.[^.]+$/.test(f))
    .filter((f) => !f.endsWith(".env.example"));

  if (trackedEnvFiles.length > 0) {
    fail(
      `Fichier(s) .env réel(s) suivi(s) par git (ne devraient JAMAIS être commités) : ${trackedEnvFiles.join(", ")}`
    );
  } else {
    ok("Aucun fichier .env réel n'est suivi par git.");
  }
} catch {
  warn("Impossible de vérifier l'index git (pas un dépôt git ?), étape ignorée.");
}

// ---------------------------------------------------------------------
// 2) .env.example doit exister et contenir toutes les variables requises
// ---------------------------------------------------------------------
if (!existsSync(ENV_EXAMPLE_PATH)) {
  fail(".env.example est introuvable à la racine du projet.");
} else {
  const exampleKeys = new Set(parseEnvKeys(readFileSync(ENV_EXAMPLE_PATH, "utf-8")));

  for (const key of REQUIRED_VARS) {
    if (!exampleKeys.has(key)) {
      fail(`La variable requise "${key}" est absente de .env.example.`);
    }
  }
  if (REQUIRED_VARS.every((k) => exampleKeys.has(k))) {
    ok("Toutes les variables requises sont documentées dans .env.example.");
  }

  // ---------------------------------------------------------------------
  // 3) Si un .env local existe, il doit couvrir au minimum les mêmes clés
  // ---------------------------------------------------------------------
  if (existsSync(ENV_PATH)) {
    const envKeys = new Set(parseEnvKeys(readFileSync(ENV_PATH, "utf-8")));
    const missing = [...exampleKeys].filter((k) => !envKeys.has(k));

    if (missing.length > 0) {
      warn(
        `Variables présentes dans .env.example mais absentes de .env local : ${missing.join(", ")}`
      );
    } else {
      ok(".env local couvre toutes les variables de .env.example.");
    }
  } else {
    warn(".env local introuvable (normal en CI ; requis pour lancer le serveur localement).");
  }
}

if (hasError) {
  console.error("\n❌ check-env: des problèmes de configuration/sécurité ont été détectés.");
  process.exit(1);
}

console.log("\n✅ check-env: configuration des variables d'environnement OK.");
