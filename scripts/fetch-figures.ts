/**
 * Fetches ~100K prominent historical figures from Wikidata SPARQL.
 * Run with: npx tsx scripts/fetch-figures.ts
 *
 * Strategy: Query in death-year ranges to avoid Wikidata's 60s timeout.
 * Each range query filters by minimum sitelinks for prominence.
 * Results are sorted locally by sitelinks count (descending).
 */

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const BATCH_DELAY_MS = 3_000;
const MAX_RETRIES = 3;
const TARGET = 100_000;

interface WikidataBinding {
  item: { value: string };
  itemLabel: { value: string };
  itemDescription?: { value: string };
  birth?: { value: string };
  death?: { value: string };
  sitelinks: { value: string };
}

interface RawFigure {
  qid: string;
  n: string;
  d: string;
  b: number | null;
  y: number | null;
  sitelinks: number;
}

interface Figure {
  n: string;
  d: string;
  b: number | null;
  y: number | null;
}

// Split into year ranges to keep each query small enough
const YEAR_RANGES: [number, number][] = [
  [-4000, 500],
  [500, 1000],
  [1000, 1300],
  [1300, 1500],
  [1500, 1600],
  [1600, 1650],
  [1650, 1700],
  [1700, 1750],
  [1750, 1790],
  [1790, 1820],
  [1820, 1840],
  [1840, 1860],
  [1860, 1875],
  [1875, 1890],
  [1890, 1900],
  [1900, 1910],
  [1910, 1920],
  [1920, 1930],
  [1930, 1940],
  [1940, 1950],
  [1950, 1960],
];

function buildQuery(yearStart: number, yearEnd: number): string {
  return `
SELECT ?item ?itemLabel ?itemDescription ?birth ?death ?sitelinks WHERE {
  ?item wdt:P31 wd:Q5 ;
        wikibase:sitelinks ?sitelinks ;
        wdt:P570 ?death .
  FILTER(YEAR(?death) >= ${yearStart} && YEAR(?death) < ${yearEnd})
  FILTER(?sitelinks >= 5)
  OPTIONAL { ?item wdt:P569 ?birth }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
`.trim();
}

function extractYear(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^-?(\d{4})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  return dateStr.startsWith("-") ? -year : year;
}

function extractQid(uri: string): string {
  return uri.split("/").pop() || uri;
}

async function fetchRange(yearStart: number, yearEnd: number, attempt = 1): Promise<WikidataBinding[]> {
  const query = buildQuery(yearStart, yearEnd);
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/sparql-results+json",
        "User-Agent": "RamblerBot/1.0 (https://github.com/bringmycakeback/rambler)",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${res.statusText} — ${body.slice(0, 200)}`);
    }

    // Some Wikidata responses contain control characters that break JSON.parse
    const text = await res.text();
    const cleaned = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
    const json = JSON.parse(cleaned);
    return json.results.bindings as WikidataBinding[];
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      const delay = BATCH_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`  Range ${yearStart}-${yearEnd} failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`);
      console.warn(`  Error: ${err instanceof Error ? err.message : err}`);
      await sleep(delay);
      return fetchRange(yearStart, yearEnd, attempt + 1);
    }
    throw err;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("Fetching historical figures from Wikidata...\n");

  const seenQids = new Set<string>();
  const allFigures: RawFigure[] = [];

  for (const [yearStart, yearEnd] of YEAR_RANGES) {
    console.log(`Fetching range ${yearStart}–${yearEnd}...`);

    try {
      const bindings = await fetchRange(yearStart, yearEnd);
      let added = 0;

      for (const b of bindings) {
        const qid = extractQid(b.item.value);
        if (seenQids.has(qid)) continue;
        seenQids.add(qid);

        const name = b.itemLabel.value;
        // Skip entries without proper English labels (Wikidata returns QID as label)
        if (/^Q\d+$/.test(name)) continue;

        allFigures.push({
          qid,
          n: name,
          d: b.itemDescription?.value || "",
          b: extractYear(b.birth?.value),
          y: extractYear(b.death?.value),
          sitelinks: parseInt(b.sitelinks.value, 10) || 0,
        });
        added++;
      }

      console.log(`  Got ${bindings.length} results, ${added} new (${allFigures.length} total)`);
    } catch (err) {
      console.error(`  FAILED range ${yearStart}-${yearEnd}: ${err instanceof Error ? err.message : err}`);
      console.error(`  Skipping this range and continuing...`);
    }

    // Respect rate limits between ranges
    await sleep(BATCH_DELAY_MS);
  }

  // Sort by sitelinks (most prominent first) and take top TARGET
  allFigures.sort((a, b) => b.sitelinks - a.sitelinks);
  const top = allFigures.slice(0, TARGET);

  // Strip internal fields for output
  const output: Figure[] = top.map(({ n, d, b, y }) => ({ n, d, b, y }));

  console.log(`\nTotal figures collected: ${allFigures.length}`);
  console.log(`Top ${output.length} figures selected (by sitelinks prominence)`);

  const { writeFileSync } = await import("fs");
  const { join, dirname } = await import("path");
  const { fileURLToPath } = await import("url");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outPath = join(__dirname, "..", "data", "figures.json");
  writeFileSync(outPath, JSON.stringify(output));
  const sizeMB = (Buffer.byteLength(JSON.stringify(output)) / 1024 / 1024).toFixed(1);
  console.log(`Written to ${outPath} (${sizeMB} MB)`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
