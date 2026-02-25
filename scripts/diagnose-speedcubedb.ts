/**
 * Diagnostic script to analyze SpeedCubeDB page structures for broken scraper sets.
 *
 * Usage: npx tsx scripts/diagnose-speedcubedb.ts
 *
 * Fetches sample pages from broken categories and dumps:
 *   - All <h3>, <h4> elements
 *   - All <a> links containing /a/
 *   - DOM structure around algorithm-like content
 *   - First 3000 chars of body text
 *   - Full raw HTML saved to tmp files
 */

import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const DUMP_DIR = resolve(PROJECT_ROOT, 'tmp/diagnose');

mkdirSync(DUMP_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Pages to diagnose
// ---------------------------------------------------------------------------

interface DiagTarget {
  label: string;
  url: string;
  issue: string;
}

const TARGETS: DiagTarget[] = [
  {
    label: 'CLS (3x3)',
    url: 'https://speedcubedb.com/a/3x3/CLS',
    issue: 'name="Filter:", all same notation',
  },
  {
    label: 'FRUF (3x3)',
    url: 'https://speedcubedb.com/a/3x3/FRUF',
    issue: 'all same notation',
  },
  {
    label: 'ZBLLU (3x3)',
    url: 'https://speedcubedb.com/a/3x3/ZBLLU',
    issue: 'name="Filter:", all same notation',
  },
  {
    label: '5x5 L2E',
    url: 'https://speedcubedb.com/a/5x5/L2E',
    issue: 'all same notation',
  },
  {
    label: 'SQ1 Lin PLL',
    url: 'https://speedcubedb.com/a/SQ1/SQ1LinPLL',
    issue: 'notation="SpeedCubeDB"',
  },
];

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!response.ok) {
      console.error(`  HTTP ${response.status} for ${url}`);
      return null;
    }
    return await response.text();
  } catch (err) {
    console.error(`  Fetch error for ${url}:`, (err as Error).message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Analyze a single page
// ---------------------------------------------------------------------------

function analyzePage(html: string, target: DiagTarget): void {
  const $ = cheerio.load(html);

  const sep = '='.repeat(80);
  const subsep = '-'.repeat(60);

  console.log(`\n${sep}`);
  console.log(`  TARGET: ${target.label}`);
  console.log(`  URL:    ${target.url}`);
  console.log(`  ISSUE:  ${target.issue}`);
  console.log(sep);

  // --- 1. <h3> elements ---
  const h3s = $('h3');
  console.log(`\n${subsep}`);
  console.log(`  <h3> elements (${h3s.length} found):`);
  console.log(subsep);
  h3s.each((i, el) => {
    const text = $(el).text().trim();
    const innerHtml = $(el).html()?.trim().substring(0, 300) || '';
    console.log(`  [${i}] text: "${text}"`);
    console.log(`       html: ${innerHtml}`);
    // Check parent for context
    const parent = $(el).parent();
    console.log(`       parent: <${parent.prop('tagName')?.toLowerCase()} class="${parent.attr('class') || ''}">`);
  });

  // --- 2. <h4> elements ---
  const h4s = $('h4');
  console.log(`\n${subsep}`);
  console.log(`  <h4> elements (${h4s.length} found):`);
  console.log(subsep);
  h4s.each((i, el) => {
    const text = $(el).text().trim();
    const innerHtml = $(el).html()?.trim().substring(0, 300) || '';
    console.log(`  [${i}] text: "${text}"`);
    console.log(`       html: ${innerHtml}`);
  });

  // --- 3. Links containing /a/ ---
  const algoLinks: { href: string; text: string }[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('/a/')) {
      algoLinks.push({
        href,
        text: $(el).text().trim().substring(0, 100),
      });
    }
  });
  console.log(`\n${subsep}`);
  console.log(`  Links containing /a/ (${algoLinks.length} found):`);
  console.log(subsep);
  for (const link of algoLinks.slice(0, 50)) {
    console.log(`  href: ${link.href}  text: "${link.text}"`);
  }
  if (algoLinks.length > 50) {
    console.log(`  ... and ${algoLinks.length - 50} more`);
  }

  // --- 4. DOM structure around algorithms ---
  console.log(`\n${subsep}`);
  console.log(`  DOM structure analysis:`);
  console.log(subsep);

  // Look for common containers: table, .card, .algo, .algorithm, [data-*]
  const selectors = [
    'table', '.card', '.algo', '.algorithm', '[class*="algo"]',
    '[class*="case"]', '[class*="cube"]', '.container', '.row',
    '[class*="filter"]', 'select', 'option', '.btn-group',
    '[class*="tab"]', '.nav-pills', '.nav-tabs',
    '[class*="notation"]', '[class*="move"]', '[class*="scramble"]',
    '[class*="setup"]', 'code', 'pre', '.badge',
  ];

  for (const sel of selectors) {
    const els = $(sel);
    if (els.length > 0) {
      console.log(`\n  Selector "${sel}" => ${els.length} match(es):`);
      els.each((i, el) => {
        if (i >= 5) {
          if (i === 5) console.log(`    ... (${els.length - 5} more)`);
          return;
        }
        const tag = ($(el).prop('tagName') || 'unknown').toLowerCase();
        const cls = $(el).attr('class') || '';
        const id = $(el).attr('id') || '';
        const text = $(el).text().trim().substring(0, 150).replace(/\n/g, '\\n');
        console.log(`    [${i}] <${tag} class="${cls}" id="${id}"> text: "${text}"`);
      });
    }
  }

  // --- 5. Look for <script> tags containing algorithm data (JSON embedded) ---
  console.log(`\n${subsep}`);
  console.log(`  Embedded data in <script> tags:`);
  console.log(subsep);
  $('script').each((i, el) => {
    const content = $(el).html() || '';
    // Look for scripts that contain algorithm-related data
    if (
      content.includes('algorithm') ||
      content.includes('Algorithm') ||
      content.includes('notation') ||
      content.includes('case') ||
      content.includes('alg') ||
      content.includes('moves') ||
      content.includes('setup')
    ) {
      const src = $(el).attr('src') || '(inline)';
      console.log(`\n  Script [${i}] src=${src} (${content.length} chars):`);
      // Print first 2000 chars of relevant scripts
      if (content.length > 0 && src === '(inline)') {
        console.log(content.substring(0, 2000));
        if (content.length > 2000) console.log(`  ... (${content.length - 2000} more chars)`);
      }
    }
  });

  // Also look for __NEXT_DATA__ or similar SSR data
  $('script#__NEXT_DATA__').each((_, el) => {
    const content = $(el).html() || '';
    console.log(`\n  __NEXT_DATA__ found (${content.length} chars):`);
    console.log(content.substring(0, 3000));
  });

  // Look for any <script type="application/json"> or similar data blocks
  $('script[type="application/json"]').each((i, el) => {
    const content = $(el).html() || '';
    console.log(`\n  application/json script [${i}] (${content.length} chars):`);
    console.log(content.substring(0, 2000));
  });

  // --- 6. Full DOM tree of the main content area ---
  console.log(`\n${subsep}`);
  console.log(`  Main content DOM tree (first 5000 chars of inner HTML):`);
  console.log(subsep);
  // Try common main content containers
  const mainContainers = ['main', '#app', '#__next', '.container', '#content', '[role="main"]', 'body > div'];
  for (const mc of mainContainers) {
    const mainEl = $(mc).first();
    if (mainEl.length > 0) {
      const innerHtml = mainEl.html() || '';
      if (innerHtml.length > 100) {
        console.log(`\n  Container: "${mc}" (${innerHtml.length} chars total)`);
        // Print structure without deep text - just tags
        const structHtml = innerHtml
          .replace(/>\s+</g, '><')  // collapse whitespace between tags
          .substring(0, 5000);
        console.log(structHtml);
        break;
      }
    }
  }

  // --- 7. Body text (first 3000 chars) ---
  console.log(`\n${subsep}`);
  console.log(`  Body text (first 3000 chars, scripts/styles removed):`);
  console.log(subsep);
  $('script, style, noscript').remove();
  const bodyText = $('body').text();
  // Collapse whitespace for readability
  const collapsed = bodyText.replace(/\s+/g, ' ').trim();
  console.log(collapsed.substring(0, 3000));

  // --- 8. Find first individual case link for deeper inspection ---
  const caseLink = algoLinks.find(
    (l) => l.href.split('/').length > 4 && !l.href.includes('Filter')
  );
  if (caseLink) {
    console.log(`\n  >>> First individual case link for deeper inspection: ${caseLink.href}`);
  }
}

// ---------------------------------------------------------------------------
// Analyze an individual case page in depth
// ---------------------------------------------------------------------------

function analyzeCasePage(html: string, url: string): void {
  const $ = cheerio.load(html);

  const sep = '='.repeat(80);
  const subsep = '-'.repeat(60);

  console.log(`\n${sep}`);
  console.log(`  INDIVIDUAL CASE PAGE: ${url}`);
  console.log(sep);

  // --- h3 ---
  const h3s = $('h3');
  console.log(`\n  <h3> elements (${h3s.length}):`);
  h3s.each((i, el) => {
    console.log(`    [${i}] text: "${$(el).text().trim()}"  html: ${$(el).html()?.trim().substring(0, 300)}`);
  });

  // --- h4 ---
  const h4s = $('h4');
  console.log(`\n  <h4> elements (${h4s.length}):`);
  h4s.each((i, el) => {
    console.log(`    [${i}] text: "${$(el).text().trim()}"  html: ${$(el).html()?.trim().substring(0, 300)}`);
  });

  // --- DOM walk from h3 down to find algo structure ---
  console.log(`\n${subsep}`);
  console.log(`  DOM walk from first <h3>:`);
  console.log(subsep);
  if (h3s.length > 0) {
    const firstH3 = $(h3s[0]);
    let node = firstH3;
    for (let i = 0; i < 30; i++) {
      node = node.next();
      if (node.length === 0) break;
      const tag = (node.prop('tagName') || '').toLowerCase();
      const cls = node.attr('class') || '';
      const id = node.attr('id') || '';
      const text = node.text().trim().substring(0, 200).replace(/\n/g, '\\n');
      const htmlSnip = (node.html() || '').substring(0, 400).replace(/\n/g, '\\n');
      console.log(`  [next ${i}] <${tag} class="${cls}" id="${id}">`);
      console.log(`    text: "${text}"`);
      console.log(`    html: ${htmlSnip}`);
    }
  }

  // --- Look for table structure ---
  const tables = $('table');
  if (tables.length > 0) {
    console.log(`\n${subsep}`);
    console.log(`  Tables (${tables.length}):`);
    console.log(subsep);
    tables.each((ti, table) => {
      const rows = $(table).find('tr');
      console.log(`  Table[${ti}] - ${rows.length} rows:`);
      rows.each((ri, row) => {
        if (ri >= 8) {
          if (ri === 8) console.log(`    ... (${rows.length - 8} more rows)`);
          return;
        }
        const cells = $(row).find('td, th');
        const cellTexts: string[] = [];
        cells.each((_, cell) => {
          cellTexts.push($(cell).text().trim().substring(0, 100));
        });
        console.log(`    Row[${ri}]: ${JSON.stringify(cellTexts)}`);
      });
    });
  }

  // --- Embedded scripts with data ---
  console.log(`\n${subsep}`);
  console.log(`  Embedded data in <script> tags:`);
  console.log(subsep);
  $('script').each((i, el) => {
    const content = $(el).html() || '';
    if (
      content.includes('algorithm') ||
      content.includes('Algorithm') ||
      content.includes('notation') ||
      content.includes('case') ||
      content.includes('alg') ||
      content.includes('votes') ||
      content.includes('setup') ||
      content.includes('moves')
    ) {
      const src = $(el).attr('src') || '(inline)';
      console.log(`\n  Script [${i}] src=${src} (${content.length} chars):`);
      if (content.length > 0 && src === '(inline)') {
        console.log(content.substring(0, 3000));
        if (content.length > 3000) console.log(`  ... (${content.length - 3000} more chars)`);
      }
    }
  });

  // --- Body text (first 3000 chars) ---
  $('script, style, noscript').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  console.log(`\n${subsep}`);
  console.log(`  Body text (first 3000 chars):`);
  console.log(subsep);
  console.log(bodyText.substring(0, 3000));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('SpeedCubeDB Diagnostic Script');
  console.log('=============================\n');
  console.log(`Dump directory: ${DUMP_DIR}\n`);

  let firstCaseLink: string | null = null;

  for (const target of TARGETS) {
    console.log(`\nFetching: ${target.url} ...`);
    const html = await fetchPage(target.url);
    if (!html) {
      console.log(`  FAILED to fetch ${target.url}`);
      continue;
    }

    // Save raw HTML
    const safeName = target.label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const htmlPath = resolve(DUMP_DIR, `${safeName}.html`);
    writeFileSync(htmlPath, html, 'utf-8');
    console.log(`  Saved raw HTML to: ${htmlPath} (${html.length} bytes)`);

    // Analyze
    analyzePage(html, target);

    // Find first case link for deeper inspection (only from first target)
    if (!firstCaseLink) {
      const $ = cheerio.load(html);
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes('/a/') && href.split('/').filter(Boolean).length >= 4 && !firstCaseLink) {
          if (href.startsWith('/')) {
            firstCaseLink = `https://speedcubedb.com${href}`;
          } else if (href.startsWith('http')) {
            firstCaseLink = href;
          }
        }
      });
    }

    // Polite delay between fetches
    await new Promise((r) => setTimeout(r, 800));
  }

  // --- Fetch one individual case page ---
  // Try CLS first case, then fall back to whatever we found
  const caseUrls = [
    'https://speedcubedb.com/a/3x3/CLS/CLS_1',
    'https://speedcubedb.com/a/3x3/CLS/CLS1',
    firstCaseLink,
  ].filter(Boolean) as string[];

  for (const caseUrl of caseUrls) {
    console.log(`\n\nFetching individual case page: ${caseUrl} ...`);
    const html = await fetchPage(caseUrl);
    if (!html) {
      console.log(`  FAILED - trying next...`);
      continue;
    }

    // Check if it's a real page with content (not a 404/redirect)
    if (html.includes('not found') || html.length < 1000) {
      console.log(`  Page appears empty or "not found" (${html.length} bytes) - trying next...`);
      continue;
    }

    const safeName = caseUrl.replace(/https?:\/\/speedcubedb\.com\/a\//, '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const htmlPath = resolve(DUMP_DIR, `case-${safeName}.html`);
    writeFileSync(htmlPath, html, 'utf-8');
    console.log(`  Saved raw HTML to: ${htmlPath} (${html.length} bytes)`);

    analyzeCasePage(html, caseUrl);
    break; // Only need one successful case page
  }

  // --- Also fetch one page that works correctly (OLL) for comparison ---
  console.log(`\n\nFetching KNOWN-GOOD page for comparison: https://speedcubedb.com/a/3x3/OLL/OLL_1 ...`);
  const goodHtml = await fetchPage('https://speedcubedb.com/a/3x3/OLL/OLL_1');
  if (goodHtml) {
    const htmlPath = resolve(DUMP_DIR, 'known-good-oll-1.html');
    writeFileSync(htmlPath, goodHtml, 'utf-8');
    console.log(`  Saved raw HTML to: ${htmlPath} (${goodHtml.length} bytes)`);
    analyzeCasePage(goodHtml, 'https://speedcubedb.com/a/3x3/OLL/OLL_1');
  }

  console.log('\n\n========== DIAGNOSIS COMPLETE ==========');
  console.log(`Raw HTML files saved in: ${DUMP_DIR}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
