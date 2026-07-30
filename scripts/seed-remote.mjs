import fs from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.');
  process.exit(1);
}

const DATA_DIR = path.join(process.cwd(), '..', 'time-tracker-private-data', 'source-data');

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r[0] && r[0].trim() !== ''));
}

function toISODate(mdY) {
  if (!mdY || !mdY.trim()) return null;
  const parts = mdY.trim().split('/');
  if (parts.length !== 3) return null;
  let [m, d, y] = parts;
  if (y.length === 2) y = '20' + y;
  return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function toTimestamp(ts, fallbackDate) {
  if (!ts || !ts.trim()) return `${fallbackDate}T00:00:00`;
  const [datePart, timePart] = ts.trim().split(' ');
  const iso = toISODate(datePart) || fallbackDate;
  return `${iso}T${(timePart || '00:00:00').padStart(8, '0')}`;
}

function num(s, fallback = 0) {
  if (s === null || s === undefined || String(s).trim() === '') return fallback;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}

function buildRows(csvPath, workerId) {
  const text = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(text);
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const [timestamp, dateStr, hours, details, rate, , prevDue, paidStatus, remarks] = rows[i];
    const entryDate = toISODate(dateStr);
    if (!entryDate) continue;
    out.push({
      worker_id: workerId,
      entry_date: entryDate,
      hours_worked: num(hours, 0),
      details: details && details.trim() ? details.trim() : null,
      hourly_rate: num(rate, 0),
      previous_due: num(prevDue, 0),
      paid_status: (paidStatus || '').trim().toUpperCase() === 'PAID' ? 'PAID' : 'UNPAID',
      remarks: remarks && remarks.trim() ? remarks.trim() : null,
      logged_at: toTimestamp(timestamp, entryDate),
    });
  }
  return out;
}

async function api(pathAndQuery, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...opts,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${opts.method || 'GET'} ${pathAndQuery} -> ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  const workers = await api('workers?select=id,name');
  const byName = Object.fromEntries(workers.map((w) => [w.name, w.id]));
  if (!byName.EMON || !byName.TUHIN) {
    throw new Error('Expected workers EMON and TUHIN to already exist (run schema.sql first).');
  }

  const emonRows = buildRows(path.join(DATA_DIR, 'emon.csv'), byName.EMON);
  const tuhinRows = buildRows(path.join(DATA_DIR, 'tuhin.csv'), byName.TUHIN);
  const allRows = [...emonRows, ...tuhinRows];

  console.log(`Inserting ${allRows.length} rows (EMON: ${emonRows.length}, TUHIN: ${tuhinRows.length})...`);

  const CHUNK = 200;
  let inserted = 0;
  for (let i = 0; i < allRows.length; i += CHUNK) {
    const chunk = allRows.slice(i, i + CHUNK);
    await api('time_entries', {
      method: 'POST',
      body: JSON.stringify(chunk),
      prefer: 'return=minimal',
    });
    inserted += chunk.length;
    console.log(`  ${inserted}/${allRows.length}`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
