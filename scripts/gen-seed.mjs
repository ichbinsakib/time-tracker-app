import fs from 'node:fs';
import path from 'node:path';

// Real historical data lives outside this (public) repo.
const SCRATCH = path.join(process.cwd(), '..', 'time-tracker-private-data', 'source-data');

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
  return rows.filter(r => r.length > 1 || (r[0] && r[0].trim() !== ''));
}

function toISODate(mdY) {
  if (!mdY || !mdY.trim()) return null;
  const parts = mdY.trim().split('/');
  if (parts.length !== 3) return null;
  let [m, d, y] = parts;
  if (y.length === 2) y = '20' + y;
  return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function toTimestamp(ts) {
  if (!ts || !ts.trim()) return null;
  const [datePart, timePart] = ts.trim().split(' ');
  const iso = toISODate(datePart);
  if (!iso) return null;
  return `${iso}T${(timePart || '00:00:00').padStart(8, '0')}`;
}

function esc(s) {
  if (s === null || s === undefined) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

function num(s) {
  if (s === null || s === undefined || String(s).trim() === '') return 'NULL';
  const n = parseFloat(s);
  return Number.isFinite(n) ? String(n) : 'NULL';
}

function buildInserts(csvPath, workerName) {
  const text = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(text);
  const header = rows[0];
  const values = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const [timestamp, dateStr, hours, details, rate, payable, prevDue, paidStatus, remarks] = r;
    const entryDate = toISODate(dateStr);
    if (!entryDate) continue; // skip blank/malformed rows
    const loggedAt = toTimestamp(timestamp) || `${entryDate}T00:00:00`;
    const hoursNum = num(hours);
    const rateNum = num(rate);
    const status = (paidStatus || '').trim().toUpperCase() === 'PAID' ? 'PAID' : 'UNPAID';
    values.push(
      `((SELECT id FROM workers WHERE name = ${esc(workerName)}), ${esc(entryDate)}, ${hoursNum === 'NULL' ? 0 : hoursNum}, ${esc(details && details.trim() ? details.trim() : null)}, ${rateNum === 'NULL' ? 0 : rateNum}, ${num(prevDue)}, ${esc(status)}, ${esc(remarks && remarks.trim() ? remarks.trim() : null)}, ${esc(loggedAt)})`
    );
  }
  return values;
}

const emonValues = buildInserts(path.join(SCRATCH, 'emon.csv'), 'EMON');
const tuhinValues = buildInserts(path.join(SCRATCH, 'tuhin.csv'), 'TUHIN');

const allValues = [...emonValues, ...tuhinValues];

const sql = `-- Seed data generated from the original Google Sheet (EMON + TUHIN tabs)
-- Run this AFTER schema.sql, inside the Supabase SQL editor.

insert into time_entries
  (worker_id, entry_date, hours_worked, details, hourly_rate, previous_due, paid_status, remarks, logged_at)
values
${allValues.join(',\n')}
;
`;

fs.writeFileSync(path.join(process.cwd(), '..', 'time-tracker-private-data', 'seed.sql'), sql);
console.log(`EMON rows: ${emonValues.length}, TUHIN rows: ${tuhinValues.length}, total: ${allValues.length}`);
