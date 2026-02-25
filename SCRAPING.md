# Scraping & Data Pipeline

## Architecture

```
Sources externes          Scripts (scripts/)           Données (src/data/)          App
─────────────────         ──────────────────           ───────────────────          ───
speedcubedb.com    ──►  scrape-speedcubedb.ts  ──►  algorithms/*.json  ──┐
jperm.net          ──►  scrape-jperm.ts        ──►  (merge OLL/PLL)    ──┤
WCA API            ──►  scrape-wca-records.ts  ──►  records.json       ──┤
                                                                         ├──► generate-knowledge.ts ──► index.ts
Curé manuellement  ──────────────────────────────►  methods/*.json     ──┤
Curé manuellement  ──────────────────────────────►  hardware/*.json    ──┤
Curé manuellement  ──────────────────────────────►  glossary.json      ──┤
Curé manuellement  ──────────────────────────────►  tips.json          ──┤
Curé manuellement  ──────────────────────────────►  learning-paths.json──┘
```

## Commandes

```bash
pnpm run scrape:speedcubedb   # Algos depuis speedcubedb.com
pnpm run scrape:wca           # Records WCA
pnpm run scrape:jperm         # OLL/PLL supplémentaires depuis jperm.net
pnpm run scrape:all           # Tout d'un coup (séquentiel)
pnpm run generate             # Valide les JSON + régénère src/data/index.ts
```

## Dépendances scraping

```json
{
  "cheerio": "^1.2.0"   // Parsing HTML (léger, pas de navigateur)
}
```

Le fetch utilise le `fetch` natif de Node 18+. Pas de puppeteer/playwright.

---

## Comment fonctionne chaque scraper

### 1. `scrape-speedcubedb.ts` — Algorithmes

**Source :** `https://speedcubedb.com/a/{puzzle}/{SetName}`

**Stratégie :** Text-based parsing avec Cheerio
1. Fetch la page principale du set → extrait les liens vers chaque cas individuel
2. Fetch chaque page de cas avec un délai de 500ms
3. Extrait le texte complet via `$('body').text()`
4. Parse avec regex :
   - Nom du cas : `"OLL 1"`, `"PLL Aa"`, `"CLL AS 1"`
   - Subset : `"3x3 - OLL - Dot Case"`
   - Setup : `Setup: F R' F' R U2' ...`
   - Algorithme principal + alternatives
   - Votes : `Community Votes: 140`
   - Movecount : `Movecount: 11 ETM`

**Config par set :**
```typescript
interface SetDefinition {
  name: string;           // "OLL", "PLL", "CLL"
  puzzle: string;         // "3x3", "2x2", "Pyraminx"
  path: string;           // URL path après /a/
  category: string;       // "last-layer", "f2l", etc.
  description: string;    // Description EN
  fileId?: string;        // Nom du fichier JSON (défaut: kebab-case du name)
  subPages?: string[];    // Pour les sets multi-pages (OLLCP1-57, VLS*)
  caseLinkPattern?: string;  // Regex pour trouver les liens des cas
  maxCases?: number;      // Limite de cas à scraper
}
```

**Protection des données :**
- Ne réécrit un fichier que si le scrape a PLUS d'algos que l'existant
- Skip si le scrape est incomplet
- Retry 2x avec backoff exponentiel

**URLs par puzzle :**
| Puzzle | Pattern URL | Exemples |
|--------|------------|----------|
| 3x3 | `/a/3x3/{Set}` | OLL, PLL, F2L, COLL, CMLL, WV, SV |
| 3x3 multi-page | `/a/3x3/OLLCP{N}` | OLLCP1 à OLLCP57 |
| 2x2 | `/a/2x2/{Set}` | CLL, EG1, EG2, OLL, PBL |
| 4x4 | `/a/4x4/{Set}` | OLLParity, PLLParity |
| Pyraminx | `/a/pyra/{Set}` | L4E, L3E |
| Megaminx | `/a/Megaminx/Megaminx{Set}` | MegaminxOLL, MegaminxPLL |
| Skewb | `/a/Skewb/{Set}` | Sarah, SarahsAdvanced |
| Square-1 | `/a/SQ1/SQ1{Set}` | SQ1CS, SQ1CO, SQ1EO, SQ1CP, SQ1EP |

### 2. `scrape-jperm.ts` — OLL/PLL (complémentaire)

**Source :** `https://jperm.net/algs/oll` et `/algs/pll`

**Stratégie :** Scraping Cheerio + données curées en fallback
- Contient les 57 OLL + 21 PLL hardcodés comme backup
- Merge avec les données speedcubedb existantes
- Combine les alternatives des deux sources

### 3. `scrape-wca-records.ts` — Records WCA

**Source :** API WCA (`worldcubeassociation.org`)

**Stratégie :** 3 niveaux de fallback
1. `GET /results/records?show=current&region=world` (détaillé)
2. `GET /api/v0/records` (basique)
3. Données hardcodées (17 événements)

**Formatage :** Centisecondes → `"3.13"`, `"1:23.45"`, Multi-BLD custom

---

## Structure des données en sortie

```
src/data/
├── index.ts                  ← GÉNÉRÉ par generate-knowledge.ts
├── records.json              ← 17 events WCA
├── glossary.json             ← 120 termes
├── tips.json                 ← 25 conseils
├── learning-paths.json       ← 8 parcours
├── algorithms/               ← 1 JSON par set (43 fichiers)
│   ├── oll.json              (57 algos)
│   ├── pll.json              (21 algos)
│   ├── zbll-u.json           (67 algos)
│   ├── ollcp.json            (342 algos)
│   └── ...
├── methods/                  ← 1 JSON par méthode (76 fichiers)
│   ├── cfop.json
│   ├── roux.json
│   └── ...
└── hardware/
    ├── cubes.json            (111 cubes)
    └── lubes.json            (31 lubes)
```

### Schéma Algorithm Set

```json
{
  "id": "oll",
  "name": "OLL",
  "puzzle": "3x3",
  "description": "Orientation of the Last Layer...",
  "category": "last-layer",
  "caseCount": 57,
  "algorithms": [
    {
      "id": "oll-1",
      "name": "OLL 1",
      "set": "OLL",
      "subset": "Dot Case",
      "puzzle": "3x3",
      "notation": "R U2 R2 F R F' U2 R' F R F'",
      "alternatives": [
        { "notation": "y R U' R2 D' r U' r' D R2 U R'", "moveCount": 11, "votes": 34 }
      ],
      "moveCount": 11,
      "setup": "",
      "votes": 140,
      "source": "speedcubedb"
    }
  ]
}
```

### Schéma CubeHardware

```json
{
  "id": "gan-16-maglev-max-uv",
  "name": "GAN 16 MagLev Max UV",
  "brand": "GAN",
  "puzzle": "3x3",
  "price": "$84",
  "tier": "flagship",
  "features": ["MagLev tensioning", "136 magnets", "UV coated"],
  "releaseYear": 2025,
  "magnetic": true,
  "smartCube": false,
  "rating": 4.9
}
```

### Schéma Lube

```json
{
  "id": "cubicle-dnm-37",
  "name": "Cubicle DNM-37",
  "brand": "TheCubicle",
  "type": "water-based",
  "viscosity": "light",
  "price": "$5",
  "description": "Premium water-based lubricant...",
  "bestFor": ["Maximum speed", "Smooth turning"]
}
```

---

## Comment ajouter un nouveau scraper

### Template de base

```typescript
import * as cheerio from 'cheerio';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'src/data/hardware');

mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Config ────────────────────────────────────────────────────
const DELAY_MS = 1000;         // Délai entre requêtes (politesse)
const MAX_RETRIES = 2;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ── Fetch avec retry ──────────────────────────────────────────
async function fetchPage(url: string): Promise<string | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      console.warn(`  ⚠ Attempt ${attempt + 1} failed: ${err}`);
      if (attempt < MAX_RETRIES) {
        await sleep(DELAY_MS * (attempt + 1));
      }
    }
  }
  return null;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Parse une page ────────────────────────────────────────────
function parsePage(html: string) {
  const $ = cheerio.load(html);
  // ... ta logique de parsing
  return data;
}

// ── Protection : ne pas écraser si moins de données ───────────
function safeWrite(filePath: string, newData: any[], key: string) {
  if (existsSync(filePath)) {
    const existing = JSON.parse(readFileSync(filePath, 'utf-8'));
    const existingCount = Array.isArray(existing) ? existing.length : existing[key]?.length ?? 0;
    if (newData.length < existingCount) {
      console.log(`  ⏭ Skipping write: scraped ${newData.length} < existing ${existingCount}`);
      return;
    }
  }
  writeFileSync(filePath, JSON.stringify(newData, null, 2));
  console.log(`  ✅ Wrote ${newData.length} entries`);
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Starting scrape...\n');
  // ... ta logique
  console.log('\n✅ Done!');
}

main().catch(console.error);
```

### Ajouter au package.json

```json
{
  "scripts": {
    "scrape:monshop": "tsx scripts/scrape-monshop.ts",
    "scrape:all": "tsx scripts/scrape-speedcubedb.ts && tsx scripts/scrape-wca-records.ts && tsx scripts/scrape-jperm.ts && tsx scripts/scrape-monshop.ts"
  }
}
```

### Régénérer l'index après ajout de données

```bash
pnpm run generate
```

---

## Guide : Scraper un shop de cubes (TheCubicle, SCS, etc.)

### Données à extraire

| Champ | Cubes | Lubes |
|-------|-------|-------|
| `id` | slug du produit | slug du produit |
| `name` | nom complet | nom complet |
| `brand` | marque | marque |
| `puzzle` | "3x3", "2x2", etc. | — |
| `price` | prix | prix |
| `tier` | flagship/mid/budget | — |
| `type` | — | silicone/water-based/hybrid |
| `viscosity` | — | light/medium/heavy |
| `features` | liste de features | — |
| `bestFor` | — | usage recommandé |
| `description` | description produit | description produit |
| `rating` | note moyenne | — |
| `reviewCount` | nombre d'avis | — |
| `reviews` | top reviews textuels | top reviews textuels |
| `releaseYear` | année | — |
| `magnetic` | bool | — |
| `smartCube` | bool | — |

### Stratégie recommandée

1. **Page listing** : Fetch la page catégorie (ex: `/collections/3x3`) → extraire les liens produits
2. **Page produit** : Pour chaque produit, fetch la page détail → extraire toutes les infos
3. **Reviews** : Souvent chargées en JS (API séparée) → chercher l'API de reviews (Yotpo, Judge.me, Stamped.io)
4. **Délai** : 1-2s entre chaque requête, ne pas surcharger

### Sites utiles à scraper

| Site | URL | Ce qu'on peut récupérer |
|------|-----|------------------------|
| TheCubicle | thecubicle.com | Cubes, lubes, prix, reviews, features |
| SpeedCubeShop | speedcubeshop.com | Cubes, lubes, prix, reviews |
| DailyPuzzles | dailypuzzles.com.au | Prix AU, stock |
| Cubezz | cubezz.com | Prix CN, catalogue exhaustif |

### Exemple : Scraper TheCubicle

```typescript
// Pages catégories
const CATEGORIES = [
  { url: '/collections/3x3-speed-cubes', puzzle: '3x3' },
  { url: '/collections/2x2-speed-cubes', puzzle: '2x2' },
  { url: '/collections/4x4-speed-cubes', puzzle: '4x4' },
  { url: '/collections/pyraminx', puzzle: 'Pyraminx' },
  // ...
];

// 1. Listing : extraire les liens produits
function parseListingPage(html: string) {
  const $ = cheerio.load(html);
  const products: string[] = [];
  $('.product-card a, .grid-product a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.startsWith('/products/')) {
      products.push(href);
    }
  });
  return [...new Set(products)];
}

// 2. Produit : extraire les détails
function parseProductPage(html: string, puzzle: string) {
  const $ = cheerio.load(html);
  return {
    name: $('h1.product-title, h1[itemprop="name"]').text().trim(),
    brand: $('.product-vendor, [itemprop="brand"]').text().trim(),
    price: $('[itemprop="price"], .product-price').first().text().trim(),
    description: $('[itemprop="description"], .product-description').text().trim(),
    rating: parseFloat($('[itemprop="ratingValue"]').attr('content') || '0'),
    features: extractFeatures($),  // Parser les bullet points
    // ...
  };
}
```

---

## Guide : Scraper des algos supplémentaires

### Sources à couvrir pour être exhaustif

| Source | URL | Sets à récupérer |
|--------|-----|-------------------|
| speedcubedb.com | Déjà couvert | ZBLS/ZBF2L, VHLS, CPEOLL, TTLL, 2GLL |
| algdb.net | algdb.net | EPLL, Magic Wunderkind, TCLL, LEG-1 |
| birdflu.lar5.com | birdflu.lar5.com | ZBLL complet (vérifier couverture) |
| bestsiteever.ru | bestsiteever.ru/tables | ZBLL, OLLCP tables |
| jperm.net | jperm.net | F2L avancé, OLL/PLL variations |

### Sets manquants identifiés (niche mais utiles)

**3x3 :**
- EPLL (4 cas — subset de PLL, edge-only)
- VHLS (Vandenbergh-Harris Last Slot)
- CPEOLL (Corner Permutation + Edge Orientation LL)
- TTLL (Twisty Turn Last Layer)
- 2GLL (2-Generator Last Layer)

**2x2 :**
- TCLL (Twisty CLL)
- LEG-1 (Layer EG)

**Pyraminx :**
- CLL Pyraminx
- 1-Flip cases

### Pattern pour ajouter un set speedcubedb

Ajouter dans le tableau `SETS` de `scrape-speedcubedb.ts` :

```typescript
{
  name: 'EPLL',
  puzzle: '3x3',
  path: '3x3/EPLL',        // URL: speedcubedb.com/a/3x3/EPLL
  category: 'last-layer',
  description: 'Edge Permutation of the Last Layer. A subset of PLL...',
  fileId: 'epll',
},
```

Puis lancer :
```bash
pnpm run scrape:speedcubedb
pnpm run generate
```

---

## Types TypeScript (référence)

Les types sont dans `src/types/index.ts`. Si tu ajoutes des champs (ex: `description` pour les cubes, `reviews`), il faut mettre à jour les interfaces :

```typescript
// Exemple : ajouter reviews aux cubes
export interface CubeHardware {
  // ... champs existants
  description?: string;       // ← NOUVEAU
  reviewCount?: number;       // ← NOUVEAU
  reviews?: CubeReview[];     // ← NOUVEAU
}

export interface CubeReview {
  author: string;
  rating: number;
  text: string;
  date: string;
}
```

---

## Checklist après tout scraping

- [ ] Lancer `pnpm run generate` → vérifie les données + régénère index.ts
- [ ] Lancer `pnpm run build` → vérifie que ça compile
- [ ] Vérifier les stats affichées par generate (nombre d'algos, méthodes, etc.)
- [ ] Ajouter les traductions FR dans `src/i18n/locales/fr/data.json` pour les nouvelles entrées
- [ ] Tester dans l'app que les nouvelles données s'affichent correctement
