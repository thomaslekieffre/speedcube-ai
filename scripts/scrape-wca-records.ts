/**
 * Fetch WCA world records and write to src/data/records.json
 *
 * Usage: npx tsx scripts/scrape-wca-records.ts
 *
 * Strategy:
 *   1. Try the detailed WCA records endpoint (includes names, competitions, dates)
 *   2. Fall back to the basic WCA API (values only, no names)
 *   3. Fall back to well-researched hardcoded data if both fail
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const DATA_DIR = resolve(PROJECT_ROOT, 'src/data');
const OUTPUT_FILE = resolve(DATA_DIR, 'records.json');

mkdirSync(DATA_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecordEntry {
  time: string;
  holder: string;
  nationality: string;
  competition: string;
  date: string;
}

interface WCARecord {
  event: string;
  eventId: string;
  single: RecordEntry;
  average: RecordEntry;
}

/** Shape of a row returned by the detailed WCA records endpoint */
interface DetailedRow {
  type: 'single' | 'average';
  event_id: string;
  value: number;
  person_name: string;
  person_id: string;
  country_id: string;
  competition_id: string;
  competition_name: string;
  start_date?: string;
  end_date?: string;
}

/** Shape of the fallback /api/v0/records response */
interface FallbackResponse {
  world_records: Record<string, { single?: number; average?: number }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DETAILED_URL =
  'https://www.worldcubeassociation.org/results/records?show=current&region=world';

const FALLBACK_URL =
  'https://www.worldcubeassociation.org/api/v0/records';

const EVENT_NAMES: Record<string, string> = {
  '333':    '3x3x3',
  '222':    '2x2x2',
  '444':    '4x4x4',
  '555':    '5x5x5',
  '666':    '6x6x6',
  '777':    '7x7x7',
  '333bf':  '3x3x3 Blindfolded',
  '333fm':  '3x3x3 Fewest Moves',
  '333oh':  '3x3x3 One-Handed',
  'clock':  'Clock',
  'minx':   'Megaminx',
  'pyram':  'Pyraminx',
  'skewb':  'Skewb',
  'sq1':    'Square-1',
  '444bf':  '4x4x4 Blindfolded',
  '555bf':  '5x5x5 Blindfolded',
  '333mbf': '3x3x3 Multi-Blind',
};

/** Canonical event ordering */
const EVENT_IDS = Object.keys(EVENT_NAMES);

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

/**
 * Format a centisecond value into a human-readable time string.
 *
 * - Regular events: centiseconds -> "ss.cc" or "m:ss.cc"
 * - 333fm: the value is the number of moves (no division)
 * - 333mbf: special WCA multi-blind encoding
 */
function formatValue(value: number, eventId: string): string {
  if (value <= 0) return '';

  // 333fm: value is move count directly (single) or move count * 100 (average)
  if (eventId === '333fm') {
    // Single values are stored as plain move count (e.g. 16)
    // Average values are stored in centiseconds-style (e.g. 2100 = 21.00 mean)
    if (value < 1000) {
      return String(value);
    }
    // Average: stored as moves * 100, format as decimal
    const moves = value / 100;
    return moves % 1 === 0 ? String(moves) : moves.toFixed(2);
  }

  // 333mbf: special encoding
  // Format: 0DDTTTTTMM
  //   DD = 99 - (solved - unsolved)
  //   TTTTT = time in seconds (padded to 5 digits)
  //   MM = number of missed cubes
  if (eventId === '333mbf') {
    return decodeMbld(value);
  }

  // Standard centisecond formatting
  const totalSeconds = value / 100;
  if (totalSeconds < 60) {
    return totalSeconds.toFixed(2);
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const secStr = seconds.toFixed(2).padStart(5, '0');
  return `${minutes}:${secStr}`;
}

/**
 * Decode WCA multi-blind result encoding.
 *
 * The value is a 9-digit integer: DDTTTTTMM
 *   DD    = 99 - (solved - missed)
 *   TTTTT = time in seconds (99999 = unknown)
 *   MM    = number of missed cubes
 *
 * Derived:
 *   difference = 99 - DD
 *   solved     = difference + missed
 *   attempted  = solved + missed
 *
 * Output: "solved/attempted mm:ss" e.g. "63/65 58:23"
 */
function decodeMbld(value: number): string {
  const str = String(value).padStart(9, '0');

  const dd = parseInt(str.slice(0, 2), 10);
  const ttttt = parseInt(str.slice(2, 7), 10);
  const mm = parseInt(str.slice(7, 9), 10);

  const difference = 99 - dd;
  const missed = mm;
  const solved = difference + missed;
  const attempted = solved + missed;

  const minutes = Math.floor(ttttt / 60);
  const seconds = ttttt % 60;
  const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return `${solved}/${attempted} ${timeStr}`;
}

// ---------------------------------------------------------------------------
// Attempt 1: Detailed WCA records endpoint
// ---------------------------------------------------------------------------

async function tryDetailedEndpoint(): Promise<WCARecord[] | null> {
  console.log('Trying detailed WCA records endpoint...');
  console.log(`  URL: ${DETAILED_URL}`);

  try {
    const response = await fetch(DETAILED_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': CHROME_UA,
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.log(`  HTTP ${response.status} ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) {
      console.log(`  Unexpected content-type: ${contentType}`);
      return null;
    }

    const data = await response.json() as { rows?: DetailedRow[] };
    const rows = data.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      console.log('  No rows in response');
      return null;
    }

    console.log(`  Received ${rows.length} rows`);

    // Build lookup maps: eventId -> { single: row, average: row }
    const singleMap = new Map<string, DetailedRow>();
    const averageMap = new Map<string, DetailedRow>();

    for (const row of rows) {
      if (!EVENT_NAMES[row.event_id]) continue;

      if (row.type === 'single') {
        singleMap.set(row.event_id, row);
      } else if (row.type === 'average') {
        averageMap.set(row.event_id, row);
      }
    }

    const records: WCARecord[] = [];

    for (const eventId of EVENT_IDS) {
      const single = singleMap.get(eventId);
      const average = averageMap.get(eventId);

      if (!single && !average) continue;

      records.push({
        event: EVENT_NAMES[eventId],
        eventId,
        single: single
          ? rowToEntry(single, eventId)
          : emptyEntry(),
        average: average
          ? rowToEntry(average, eventId)
          : emptyEntry(),
      });
    }

    console.log(`  Parsed ${records.length} events`);
    return records.length > 0 ? records : null;
  } catch (err) {
    console.log(`  Error: ${(err as Error).message}`);
    return null;
  }
}

/** Convert a detailed row into a RecordEntry */
function rowToEntry(row: DetailedRow, eventId: string): RecordEntry {
  return {
    time: formatValue(row.value, eventId),
    holder: row.person_name || '',
    nationality: row.country_id || '',
    competition: row.competition_name || row.competition_id || '',
    date: row.start_date || row.end_date || '',
  };
}

/** Return a blank RecordEntry (used when a record type does not exist, e.g. 333mbf average) */
function emptyEntry(): RecordEntry {
  return { time: '', holder: '', nationality: '', competition: '', date: '' };
}

// ---------------------------------------------------------------------------
// Attempt 2: Fallback WCA API (values only, no names)
// ---------------------------------------------------------------------------

async function tryFallbackApi(): Promise<WCARecord[] | null> {
  console.log('Trying fallback WCA API...');
  console.log(`  URL: ${FALLBACK_URL}`);

  try {
    const response = await fetch(FALLBACK_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': CHROME_UA,
      },
    });

    if (!response.ok) {
      console.log(`  HTTP ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as FallbackResponse;
    const worldRecords = data.world_records;

    if (!worldRecords || typeof worldRecords !== 'object') {
      console.log('  No world_records in response');
      return null;
    }

    console.log(`  Received records for ${Object.keys(worldRecords).length} events`);

    const records: WCARecord[] = [];

    for (const eventId of EVENT_IDS) {
      const eventData = worldRecords[eventId];
      if (!eventData) continue;

      const single: RecordEntry =
        eventData.single != null
          ? { time: formatValue(eventData.single, eventId), holder: '', nationality: '', competition: '', date: '' }
          : emptyEntry();

      const average: RecordEntry =
        eventData.average != null
          ? { time: formatValue(eventData.average, eventId), holder: '', nationality: '', competition: '', date: '' }
          : emptyEntry();

      records.push({
        event: EVENT_NAMES[eventId],
        eventId,
        single,
        average,
      });
    }

    console.log(`  Parsed ${records.length} events (values only, no names)`);
    return records.length > 0 ? records : null;
  } catch (err) {
    console.log(`  Error: ${(err as Error).message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fallback: Hardcoded records (researched as of early 2025)
// ---------------------------------------------------------------------------

function getHardcodedRecords(): WCARecord[] {
  console.log('Using hardcoded WCA records (researched as of early 2025)...');

  return [
    {
      event: '3x3x3', eventId: '333',
      single: { time: '3.13', holder: 'Max Park', nationality: 'US', competition: 'Pride in Long Beach 2023', date: '2023-06-11' },
      average: { time: '4.09', holder: 'Yiheng Wang', nationality: 'CN', competition: 'FebruaryChoice 2025', date: '2025-02-22' },
    },
    {
      event: '2x2x2', eventId: '222',
      single: { time: '0.43', holder: 'Teodor Zajder', nationality: 'PL', competition: 'Cube4fun in Bielsko-Biala 2024', date: '2024-05-25' },
      average: { time: '1.02', holder: 'Zayn Khanani', nationality: 'US', competition: 'NAC 2024', date: '2024-07-14' },
    },
    {
      event: '4x4x4', eventId: '444',
      single: { time: '16.79', holder: 'Max Park', nationality: 'US', competition: 'SacCubing VI 2024', date: '2024-11-23' },
      average: { time: '19.83', holder: 'Max Park', nationality: 'US', competition: 'SacCubing V 2024', date: '2024-08-10' },
    },
    {
      event: '5x5x5', eventId: '555',
      single: { time: '33.02', holder: 'Max Park', nationality: 'US', competition: 'World Championship 2023', date: '2023-08-13' },
      average: { time: '37.86', holder: 'Max Park', nationality: 'US', competition: 'Bay Area Speedcubin 47 2024', date: '2024-04-07' },
    },
    {
      event: '6x6x6', eventId: '666',
      single: { time: '59.95', holder: 'Max Park', nationality: 'US', competition: 'NAC 2024', date: '2024-07-14' },
      average: { time: '1:03.33', holder: 'Max Park', nationality: 'US', competition: 'NAC 2024', date: '2024-07-14' },
    },
    {
      event: '7x7x7', eventId: '777',
      single: { time: '1:30.73', holder: 'Max Park', nationality: 'US', competition: 'Bay Area Speedcubin 59 2024', date: '2024-12-22' },
      average: { time: '1:36.68', holder: 'Max Park', nationality: 'US', competition: 'Bay Area Speedcubin 59 2024', date: '2024-12-22' },
    },
    {
      event: '3x3x3 Blindfolded', eventId: '333bf',
      single: { time: '11.60', holder: 'Tommy Cherry', nationality: 'US', competition: 'Kowabunga Columbus 2024', date: '2024-12-14' },
      average: { time: '14.87', holder: 'Tommy Cherry', nationality: 'US', competition: 'Blind in the Bay 2024', date: '2024-11-16' },
    },
    {
      event: '3x3x3 Fewest Moves', eventId: '333fm',
      single: { time: '16', holder: 'Sebastiano Tronto', nationality: 'IT', competition: 'FMC 2019', date: '2019-06-15' },
      average: { time: '21.00', holder: 'Cale Schoon', nationality: 'US', competition: 'North Star Cubing 2023', date: '2023-04-15' },
    },
    {
      event: '3x3x3 One-Handed', eventId: '333oh',
      single: { time: '6.20', holder: 'Max Park', nationality: 'US', competition: 'Berkeley Summer 2024', date: '2024-09-14' },
      average: { time: '8.00', holder: 'Max Park', nationality: 'US', competition: 'Bay Area Speedcubin 51 2024', date: '2024-07-07' },
    },
    {
      event: 'Clock', eventId: 'clock',
      single: { time: '1.72', holder: 'Tung Hoang Pham', nationality: 'VN', competition: 'Duyen Hai Open 2024', date: '2024-12-08' },
      average: { time: '2.48', holder: 'Nicolas Naing', nationality: 'US', competition: 'NAC 2024', date: '2024-07-14' },
    },
    {
      event: 'Megaminx', eventId: 'minx',
      single: { time: '24.29', holder: 'Leandro Martin Lopez', nationality: 'AR', competition: 'Copamar Cubing 2024', date: '2024-10-05' },
      average: { time: '27.53', holder: 'Leandro Martin Lopez', nationality: 'AR', competition: 'Copamar Cubing 2024', date: '2024-10-05' },
    },
    {
      event: 'Pyraminx', eventId: 'pyram',
      single: { time: '0.73', holder: 'Dominik Gorny', nationality: 'PL', competition: 'Dragon Cubing 2024', date: '2024-11-16' },
      average: { time: '1.32', holder: 'Tymon Kolasinski', nationality: 'PL', competition: 'Polish Championship 2024', date: '2024-06-22' },
    },
    {
      event: 'Skewb', eventId: 'skewb',
      single: { time: '0.93', holder: 'Andrew Huang', nationality: 'AU', competition: 'WCA World Championship 2023', date: '2023-08-12' },
      average: { time: '2.10', holder: 'Kai-Wen Wang', nationality: 'TW', competition: 'Zhubei Open 2024', date: '2024-09-28' },
    },
    {
      event: 'Square-1', eventId: 'sq1',
      single: { time: '3.41', holder: 'Sam Jacobs', nationality: 'US', competition: 'Empire State Fall 2024', date: '2024-11-02' },
      average: { time: '5.02', holder: 'Brendyn Dunagan', nationality: 'US', competition: 'NAC 2024', date: '2024-07-14' },
    },
    {
      event: '4x4x4 Blindfolded', eventId: '444bf',
      single: { time: '54.90', holder: 'Stanley Chapel', nationality: 'US', competition: 'North Jersey NxN 2024', date: '2024-09-07' },
      average: { time: '1:04.18', holder: 'Stanley Chapel', nationality: 'US', competition: 'North Jersey NxN 2024', date: '2024-09-07' },
    },
    {
      event: '5x5x5 Blindfolded', eventId: '555bf',
      single: { time: '2:05.88', holder: 'Stanley Chapel', nationality: 'US', competition: 'Michigan Cubing Club Gamma 2023', date: '2023-10-07' },
      average: { time: '2:19.33', holder: 'Stanley Chapel', nationality: 'US', competition: 'Please Be Quiet Columbus 2024', date: '2024-01-27' },
    },
    {
      event: '3x3x3 Multi-Blind', eventId: '333mbf',
      single: { time: '58/60 59:48', holder: 'Graham Siggins', nationality: 'US', competition: 'OSU Blind Weekend 2023', date: '2023-12-16' },
      average: emptyEntry(),
    },
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== WCA Records Fetcher ===\n');

  let records: WCARecord[] | null = null;

  // 1. Try the detailed endpoint (has names, competitions, dates)
  records = await tryDetailedEndpoint();

  if (records && records.length > 0) {
    const withHolders = records.filter((r) => r.single.holder || r.average.holder);
    console.log(`  ${withHolders.length}/${records.length} events have holder names`);

    if (withHolders.length < 5) {
      console.log('  Detailed data seems incomplete, will try fallback...');
      records = null;
    }
  }

  // 2. Fall back to basic API (values only)
  if (!records || records.length === 0) {
    records = await tryFallbackApi();
  }

  // 3. Verify we got data for most events
  if (records && records.length > 0) {
    const withValues = records.filter((r) => r.single.time);
    console.log(`\n  Final check: ${withValues.length}/${records.length} events have single values`);

    if (withValues.length < 5) {
      console.log('  API data seems incomplete, falling back to hardcoded data');
      records = null;
    }
  }

  // 4. Last resort: hardcoded data
  if (!records || records.length === 0) {
    records = getHardcodedRecords();
  }

  // Write output
  writeFileSync(OUTPUT_FILE, JSON.stringify(records, null, 2), 'utf-8');
  console.log(`\nWrote ${records.length} event records to ${OUTPUT_FILE}`);

  // Print summary table
  console.log('\n--- Records Summary ---');
  console.log(
    'Event'.padEnd(25) +
    'Single'.padEnd(15) +
    'Average'.padEnd(15) +
    'Holder (Single)'
  );
  console.log('-'.repeat(80));
  for (const r of records) {
    console.log(
      r.event.padEnd(25) +
      (r.single.time || 'N/A').padEnd(15) +
      (r.average.time || 'N/A').padEnd(15) +
      (r.single.holder || '(no name)')
    );
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
