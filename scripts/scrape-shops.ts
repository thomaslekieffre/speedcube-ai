/**
 * Scrape cubes, lubes, and accessories from TheCubicle and SpeedCubeShop
 * via their public Shopify JSON APIs.
 *
 * Usage: npx tsx scripts/scrape-shops.ts
 *
 * Strategy:
 *   1. Fetch /collections.json to discover collection handles
 *   2. Fetch /collections/{handle}/products.json for each puzzle category
 *   3. Parse product data: name, brand, price, description, features, tags
 *   4. Classify into cubes vs lubes vs accessories
 *   5. Merge with existing data (only add new products, update prices)
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const HARDWARE_DIR = resolve(PROJECT_ROOT, 'src/data/hardware');

mkdirSync(HARDWARE_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  vendor: string;
  product_type: string;
  body_html: string;
  tags: string[];
  variants: { price: string; compare_at_price: string | null; available: boolean }[];
  images: { src: string }[];
  published_at: string;
  created_at: string;
}

interface CubeHardware {
  id: string;
  name: string;
  brand: string;
  puzzle: string;
  price: string;
  tier: 'budget' | 'mid' | 'flagship';
  features: string[];
  releaseYear: number;
  magnetic: boolean;
  smartCube?: boolean;
  rating?: number;
  reviewCount?: number;
  image?: string;
}

interface Lube {
  id: string;
  name: string;
  brand: string;
  type: 'silicone' | 'water-based' | 'hybrid';
  viscosity: 'light' | 'medium' | 'heavy';
  price: string;
  description: string;
  bestFor: string[];
  rating?: number;
  reviewCount?: number;
  image?: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DELAY_MS = 800;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SHOPS = [
  {
    name: 'TheCubicle',
    base: 'https://www.thecubicle.com',
    cubeCollections: [
      { handle: '3x3-speed-cubes', puzzle: '3x3' },
      { handle: '2x2-speed-cubes', puzzle: '2x2' },
      { handle: '4x4-speed-cubes', puzzle: '4x4' },
      { handle: '5x5-speed-cubes', puzzle: '5x5' },
      { handle: '6x6-speed-cubes', puzzle: '6x6' },
      { handle: '7x7-speed-cubes', puzzle: '7x7' },
      { handle: 'pyraminx-1', puzzle: 'Pyraminx' },
      { handle: 'megaminx', puzzle: 'Megaminx' },
      { handle: 'skewb', puzzle: 'Skewb' },
      { handle: 'square-1', puzzle: 'Square-1' },
      { handle: 'clock', puzzle: 'Clock' },
      { handle: 'smart-cubes', puzzle: '3x3' },
    ],
    lubeCollections: ['lubricants'],
  },
  {
    name: 'SpeedCubeShop',
    base: 'https://speedcubeshop.com',
    cubeCollections: [
      { handle: '3x3-speed-cubes', puzzle: '3x3' },
      { handle: '2x2-speed-cubes', puzzle: '2x2' },
      { handle: '4x4-speed-cubes', puzzle: '4x4' },
      { handle: '5x5-speed-cubes', puzzle: '5x5' },
      { handle: '6x6-speed-cubes', puzzle: '6x6' },
      { handle: '7x7-speed-cubes', puzzle: '7x7' },
      { handle: 'pyraminx', puzzle: 'Pyraminx' },
      { handle: 'megaminx', puzzle: 'Megaminx' },
      { handle: 'skewb', puzzle: 'Skewb' },
      { handle: 'square-1', puzzle: 'Square-1' },
      { handle: 'clock', puzzle: 'Clock' },
    ],
    lubeCollections: ['lubricant'],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchJSON(url: string): Promise<any | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`  ⚠ Attempt ${attempt + 1} failed for ${url}: ${err}`);
      if (attempt < 2) await sleep(DELAY_MS * (attempt + 1));
    }
  }
  return null;
}

async function fetchHTML(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      console.warn(`  ⚠ Attempt ${attempt + 1} failed for ${url}: ${err}`);
      if (attempt < 2) await sleep(DELAY_MS * (attempt + 1));
    }
  }
  return null;
}

async function fetchRating(baseUrl: string, handle: string): Promise<{ rating: number; reviewCount: number } | null> {
  const html = await fetchHTML(`${baseUrl}/products/${handle}`);
  if (!html) return null;

  const ratingMatch = html.match(/data-average-rating="([\d.]+)"/);
  const countMatch = html.match(/data-number-of-reviews="(\d+)"/);

  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
  const reviewCount = countMatch ? parseInt(countMatch[1]) : 0;

  if (rating === 0 || reviewCount === 0) return null;
  return { rating, reviewCount };
}

async function fetchAllProducts(baseUrl: string, collectionHandle: string): Promise<ShopifyProduct[]> {
  const allProducts: ShopifyProduct[] = [];
  let page = 1;
  const limit = 250;

  while (true) {
    const url = `${baseUrl}/collections/${collectionHandle}/products.json?limit=${limit}&page=${page}`;
    const data = await fetchJSON(url);
    if (!data?.products?.length) break;
    allProducts.push(...data.products);
    if (data.products.length < limit) break;
    page++;
    await sleep(DELAY_MS);
  }
  return allProducts;
}

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|ul|ol|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractFeatures(description: string, tags: string[]): string[] {
  const features: string[] = [];
  const desc = description.toLowerCase();

  if (tags.some(t => t.toLowerCase().includes('maglev')) || desc.includes('maglev')) features.push('MagLev tensioning');
  if (tags.some(t => t.toLowerCase().includes('magnetic')) || desc.includes('magnetic')) features.push('Magnetic');
  if (desc.includes('uv coat') || desc.includes('uv-coat')) features.push('UV coated');
  if (desc.includes('ball-core') || desc.includes('ball core')) features.push('Ball-core system');
  if (desc.includes('stickerless')) features.push('Stickerless');
  if (desc.includes('smart cube') || desc.includes('bluetooth') || desc.includes('app-connected')) features.push('Smart cube');
  if (desc.includes('spring')) features.push('Spring system');
  if (desc.includes('corner cutting')) features.push('Corner cutting');
  if (desc.includes('frosted')) features.push('Frosted plastic');
  if (desc.includes('dual adjustment')) features.push('Dual adjustment');

  // Extract magnet count
  const magnetMatch = desc.match(/(\d+)\s*magnets/i);
  if (magnetMatch) features.push(`${magnetMatch[1]} magnets`);

  return features.length > 0 ? features : ['Stickerless'];
}

function classifyTier(price: number, puzzle: string): 'budget' | 'mid' | 'flagship' {
  if (puzzle === '3x3') {
    if (price >= 40) return 'flagship';
    if (price >= 18) return 'mid';
    return 'budget';
  }
  if (['4x4', '5x5', '6x6', '7x7'].includes(puzzle)) {
    if (price >= 45) return 'flagship';
    if (price >= 20) return 'mid';
    return 'budget';
  }
  // Pyraminx, Skewb, Megaminx, SQ1, Clock
  if (price >= 30) return 'flagship';
  if (price >= 15) return 'mid';
  return 'budget';
}

function classifyLubeType(title: string, desc: string): 'silicone' | 'water-based' | 'hybrid' {
  const text = (title + ' ' + desc).toLowerCase();
  if (text.includes('water-based') || text.includes('water based')) return 'water-based';
  if (text.includes('hybrid')) return 'hybrid';
  return 'silicone';
}

function classifyViscosity(title: string, desc: string): 'light' | 'medium' | 'heavy' {
  const text = (title + ' ' + desc).toLowerCase();
  if (text.includes('weight 5') || text.includes('weight 4') || text.includes('heavy') || text.includes('50k') || text.includes('30k') || text.includes('compound x') || text.includes('thick')) return 'heavy';
  if (text.includes('weight 1') || text.includes('light') || text.includes('speed') || text.includes('silk') || text.includes('dnm') || text.includes('fast') || text.includes('10k')) return 'light';
  return 'medium';
}

function isLube(product: ShopifyProduct): boolean {
  const title = product.title.toLowerCase();
  const type = product.product_type.toLowerCase();
  const tags = product.tags.map(t => t.toLowerCase());
  return type.includes('lube') || type.includes('lubricant') ||
    title.includes('lube') || title.includes('lubricant') ||
    tags.some(t => t.includes('lube') || t.includes('lubricant'));
}

function isCube(product: ShopifyProduct): boolean {
  const title = product.title.toLowerCase();
  const type = product.product_type.toLowerCase();
  // Exclude accessories, bundles, stickers, bags, timers, etc.
  const exclude = ['sticker', 'bag', 'case', 'timer', 'mat', 'bundle', 'gift', 'card', 'stand', 'display', 'screwdriver', 'tool', 'book', 'poster'];
  if (exclude.some(e => title.includes(e) || type.includes(e))) return false;
  if (isLube(product)) return false;
  return true;
}

function isSmart(product: ShopifyProduct): boolean {
  const text = (product.title + ' ' + product.body_html + ' ' + product.tags.join(' ')).toLowerCase();
  return text.includes('smart cube') || text.includes('bluetooth') || text.includes('app-connected') || text.includes('giiker') || text.includes(' ai ');
}

function detectPuzzleFromProduct(product: ShopifyProduct, fallbackPuzzle: string): string {
  const title = product.title.toLowerCase();
  const type = product.product_type.toLowerCase();
  const text = title + ' ' + type;

  if (text.includes('2x2')) return '2x2';
  if (text.includes('4x4')) return '4x4';
  if (text.includes('5x5')) return '5x5';
  if (text.includes('6x6')) return '6x6';
  if (text.includes('7x7')) return '7x7';
  if (text.includes('pyraminx') || text.includes('pyra')) return 'Pyraminx';
  if (text.includes('megaminx') || text.includes('mega')) return 'Megaminx';
  if (text.includes('skewb')) return 'Skewb';
  if (text.includes('square-1') || text.includes('sq1') || text.includes('square 1')) return 'Square-1';
  if (text.includes('clock')) return 'Clock';
  if (text.includes('3x3')) return '3x3';

  return fallbackPuzzle;
}

function extractYear(product: ShopifyProduct): number {
  // Try to extract year from title
  const yearMatch = product.title.match(/20(2[0-9])/);
  if (yearMatch) return parseInt(`20${yearMatch[1]}`);
  // Use published_at date
  const pubYear = new Date(product.published_at || product.created_at).getFullYear();
  return pubYear > 2020 ? pubYear : 2024;
}

function getProductImage(product: ShopifyProduct): string | undefined {
  const src = product.images?.[0]?.src;
  return src || undefined;
}

function productToCube(product: ShopifyProduct, puzzle: string): CubeHardware {
  const price = parseFloat(product.variants[0]?.price || '0');
  const desc = stripHtml(product.body_html || '');
  const detectedPuzzle = detectPuzzleFromProduct(product, puzzle);
  const image = getProductImage(product);

  return {
    id: slugify(product.title),
    name: product.title.trim(),
    brand: product.vendor || 'Unknown',
    puzzle: detectedPuzzle,
    price: `$${price}`,
    tier: classifyTier(price, detectedPuzzle),
    features: extractFeatures(desc, product.tags),
    releaseYear: extractYear(product),
    magnetic: (product.title + desc + product.tags.join(' ')).toLowerCase().includes('magnet'),
    smartCube: isSmart(product),
    ...(image ? { image } : {}),
  };
}

function productToLube(product: ShopifyProduct, shopBrand: string): Lube {
  const price = parseFloat(product.variants[0]?.price || '0');
  const desc = stripHtml(product.body_html || '');
  const title = product.title.trim();
  const image = getProductImage(product);

  return {
    id: slugify(title),
    name: title,
    brand: product.vendor || shopBrand,
    type: classifyLubeType(title, desc),
    viscosity: classifyViscosity(title, desc),
    price: `$${price}`,
    description: desc.split('\n')[0]?.slice(0, 300) || `${title} lubricant.`,
    bestFor: extractLubeBestFor(title, desc),
    ...(image ? { image } : {}),
  };
}

function extractLubeBestFor(title: string, desc: string): string[] {
  const text = (title + ' ' + desc).toLowerCase();
  const bestFor: string[] = [];

  if (text.includes('speed') || text.includes('fast')) bestFor.push('Speed boost');
  if (text.includes('core')) bestFor.push('Core lubrication');
  if (text.includes('piece') || text.includes('surface')) bestFor.push('Piece surfaces');
  if (text.includes('smooth')) bestFor.push('Smooth feel');
  if (text.includes('control') || text.includes('slow')) bestFor.push('Control');
  if (text.includes('spring')) bestFor.push('Spring noise reduction');
  if (text.includes('long-lasting') || text.includes('long lasting')) bestFor.push('Long-lasting');
  if (text.includes('beginner') || text.includes('all-purpose')) bestFor.push('All-around use');

  return bestFor.length > 0 ? bestFor : ['General maintenance'];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🛒 Scraping speedcube shops...\n');

  // Load existing data
  const cubesPath = resolve(HARDWARE_DIR, 'cubes.json');
  const lubesPath = resolve(HARDWARE_DIR, 'lubes.json');
  const existingCubes: CubeHardware[] = existsSync(cubesPath) ? JSON.parse(readFileSync(cubesPath, 'utf-8')) : [];
  const existingLubes: Lube[] = existsSync(lubesPath) ? JSON.parse(readFileSync(lubesPath, 'utf-8')) : [];
  const existingCubeIds = new Set(existingCubes.map(c => c.id));
  const existingLubeIds = new Set(existingLubes.map(l => l.id));

  // Also track by name to avoid near-duplicates
  const existingCubeNames = new Set(existingCubes.map(c => c.name.toLowerCase()));
  const existingLubeNames = new Set(existingLubes.map(l => l.name.toLowerCase()));

  // Maps for backfilling images on existing items
  const cubeImageMap = new Map<string, string>();
  const lubeImageMap = new Map<string, string>();

  // Maps for rating scraping: id → { shopBase, handle }
  const cubeHandleMap = new Map<string, { shopBase: string; handle: string }>();
  const lubeHandleMap = new Map<string, { shopBase: string; handle: string }>();

  const newCubes: CubeHardware[] = [];
  const newLubes: Lube[] = [];
  let scrapedCubeCount = 0;
  let scrapedLubeCount = 0;

  for (const shop of SHOPS) {
    console.log(`\n📦 ${shop.name} (${shop.base})`);

    // ── Scrape cube collections ────────────────────────────────
    for (const col of shop.cubeCollections) {
      console.log(`  🧊 Collection: ${col.handle} (${col.puzzle})`);
      const products = await fetchAllProducts(shop.base, col.handle);
      console.log(`     Found ${products.length} products`);

      for (const product of products) {
        if (!product.variants?.length || !product.variants[0].available) continue;
        const price = parseFloat(product.variants[0].price);
        if (price <= 0 || price > 500) continue;

        if (isLube(product)) {
          scrapedLubeCount++;
          const lube = productToLube(product, shop.name);
          lubeHandleMap.set(lube.id, { shopBase: shop.base, handle: product.handle });
          if (!existingLubeIds.has(lube.id) && !existingLubeNames.has(lube.name.toLowerCase())) {
            newLubes.push(lube);
            existingLubeIds.add(lube.id);
            existingLubeNames.add(lube.name.toLowerCase());
          } else if (lube.image) {
            lubeImageMap.set(lube.id, lube.image);
          }
        } else if (isCube(product)) {
          scrapedCubeCount++;
          const cube = productToCube(product, col.puzzle);
          cubeHandleMap.set(cube.id, { shopBase: shop.base, handle: product.handle });
          if (!existingCubeIds.has(cube.id) && !existingCubeNames.has(cube.name.toLowerCase())) {
            newCubes.push(cube);
            existingCubeIds.add(cube.id);
            existingCubeNames.add(cube.name.toLowerCase());
          } else if (cube.image) {
            cubeImageMap.set(cube.id, cube.image);
          }
        }
      }
      await sleep(DELAY_MS);
    }

    // ── Scrape lube collections ────────────────────────────────
    for (const lubeHandle of shop.lubeCollections) {
      console.log(`  🧴 Lube collection: ${lubeHandle}`);
      const products = await fetchAllProducts(shop.base, lubeHandle);
      console.log(`     Found ${products.length} products`);

      for (const product of products) {
        if (!product.variants?.length || !product.variants[0].available) continue;
        const price = parseFloat(product.variants[0].price);
        if (price <= 0 || price > 100) continue;
        if (!isLube(product)) continue;

        scrapedLubeCount++;
        const lube = productToLube(product, shop.name);
        lubeHandleMap.set(lube.id, { shopBase: shop.base, handle: product.handle });
        if (!existingLubeIds.has(lube.id) && !existingLubeNames.has(lube.name.toLowerCase())) {
          newLubes.push(lube);
          existingLubeIds.add(lube.id);
          existingLubeNames.add(lube.name.toLowerCase());
        } else if (lube.image) {
          lubeImageMap.set(lube.id, lube.image);
        }
      }
      await sleep(DELAY_MS);
    }
  }

  // ── Scrape ratings (2nd pass) ────────────────────────────────
  const allCubes = [...existingCubes, ...newCubes];
  const allLubes = [...existingLubes, ...newLubes];
  const cubeRatingMap = new Map<string, { rating: number; reviewCount: number }>();
  const lubeRatingMap = new Map<string, { rating: number; reviewCount: number }>();

  // Cubes needing ratings
  const cubesNeedingRating = allCubes.filter(c => !(c.rating && c.reviewCount) && cubeHandleMap.has(c.id));
  console.log(`\n⭐ Scraping ratings for ${cubesNeedingRating.length} cubes...`);
  let cubeRatingsFound = 0;
  for (const cube of cubesNeedingRating) {
    const info = cubeHandleMap.get(cube.id)!;
    const result = await fetchRating(info.shopBase, info.handle);
    if (result) {
      cubeRatingMap.set(cube.id, result);
      cubeRatingsFound++;
    }
    await sleep(DELAY_MS);
  }
  console.log(`   Found ${cubeRatingsFound} cube ratings`);

  // Lubes needing ratings
  const lubesNeedingRating = allLubes.filter(l => !(l.rating && l.reviewCount) && lubeHandleMap.has(l.id));
  console.log(`⭐ Scraping ratings for ${lubesNeedingRating.length} lubes...`);
  let lubeRatingsFound = 0;
  for (const lube of lubesNeedingRating) {
    const info = lubeHandleMap.get(lube.id)!;
    const result = await fetchRating(info.shopBase, info.handle);
    if (result) {
      lubeRatingMap.set(lube.id, result);
      lubeRatingsFound++;
    }
    await sleep(DELAY_MS);
  }
  console.log(`   Found ${lubeRatingsFound} lube ratings`);

  // ── Backfill images on existing items ────────────────────────
  let cubeImagesUpdated = 0;
  let lubeImagesUpdated = 0;
  let cubeRatingsUpdated = 0;
  let lubeRatingsUpdated = 0;
  for (const cube of existingCubes) {
    if (!cube.image && cubeImageMap.has(cube.id)) {
      cube.image = cubeImageMap.get(cube.id);
      cubeImagesUpdated++;
    }
    if (cubeRatingMap.has(cube.id)) {
      const r = cubeRatingMap.get(cube.id)!;
      cube.rating = r.rating;
      cube.reviewCount = r.reviewCount;
      cubeRatingsUpdated++;
    }
  }
  for (const lube of existingLubes) {
    if (!lube.image && lubeImageMap.has(lube.id)) {
      lube.image = lubeImageMap.get(lube.id);
      lubeImagesUpdated++;
    }
    if (lubeRatingMap.has(lube.id)) {
      const r = lubeRatingMap.get(lube.id)!;
      lube.rating = r.rating;
      lube.reviewCount = r.reviewCount;
      lubeRatingsUpdated++;
    }
  }
  // Also apply ratings to new items
  for (const cube of newCubes) {
    if (cubeRatingMap.has(cube.id)) {
      const r = cubeRatingMap.get(cube.id)!;
      cube.rating = r.rating;
      cube.reviewCount = r.reviewCount;
    }
  }
  for (const lube of newLubes) {
    if (lubeRatingMap.has(lube.id)) {
      const r = lubeRatingMap.get(lube.id)!;
      lube.rating = r.rating;
      lube.reviewCount = r.reviewCount;
    }
  }

  // ── Merge and write ──────────────────────────────────────────
  console.log('\n─────────────────────────────────────');
  console.log(`Scraped: ${scrapedCubeCount} cubes, ${scrapedLubeCount} lubes`);
  console.log(`New cubes to add: ${newCubes.length}`);
  console.log(`New lubes to add: ${newLubes.length}`);
  console.log(`Images backfilled: ${cubeImagesUpdated} cubes, ${lubeImagesUpdated} lubes`);
  console.log(`Ratings backfilled: ${cubeRatingsUpdated} cubes, ${lubeRatingsUpdated} lubes`);

  const needsCubeWrite = newCubes.length > 0 || cubeImagesUpdated > 0 || cubeRatingsUpdated > 0;
  const needsLubeWrite = newLubes.length > 0 || lubeImagesUpdated > 0 || lubeRatingsUpdated > 0;

  if (needsCubeWrite) {
    const merged = [...existingCubes, ...newCubes];
    // Sort: by puzzle, then by price descending (flagship first)
    merged.sort((a, b) => {
      if (a.puzzle !== b.puzzle) return a.puzzle.localeCompare(b.puzzle);
      const pa = parseFloat(a.price.replace('$', ''));
      const pb = parseFloat(b.price.replace('$', ''));
      return pb - pa;
    });
    writeFileSync(cubesPath, JSON.stringify(merged, null, 2));
    console.log(`✅ Wrote ${merged.length} cubes (was ${existingCubes.length}, +${newCubes.length} new, ${cubeImagesUpdated} images updated)`);
  } else {
    console.log('ℹ️  No cube changes.');
  }

  if (needsLubeWrite) {
    const merged = [...existingLubes, ...newLubes];
    writeFileSync(lubesPath, JSON.stringify(merged, null, 2));
    console.log(`✅ Wrote ${merged.length} lubes (was ${existingLubes.length}, +${newLubes.length} new, ${lubeImagesUpdated} images updated)`);
  } else {
    console.log('ℹ️  No lube changes.');
  }

  console.log('\n🏁 Done!');
}

main().catch(console.error);
