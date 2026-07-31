import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { TimeEntry, Worker } from '../lib/types';
import SummaryCards from './SummaryCards';
import WorkerEntryForm, { type WorkerEntryValues } from './WorkerEntryForm';
import EntryTable from './EntryTable';

export default function WorkerApp({ workerId }: { workerId: string }) {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId]);

  async function load() {
    setLoading(true);
    const [{ data: workerData, error: workerErr }, { data: entryData, error: entryErr }] =
      await Promise.all([
        supabase.from('workers').select('*').eq('id', workerId).single(),
        supabase
          .from('time_entries')
          .select('*')
          .eq('worker_id', workerId)
          .order('entry_date', { ascending: false }),
      ]);
    if (workerErr) setError(workerErr.message);
    if (entryErr) setError(entryErr.message);
    setWorker(workerData || null);
    setEntries(entryData || []);
    setLoading(false);
  }

  async function handleSubmit(values: WorkerEntryValues) {
    if (!worker) return;
    const { error } = await supabase.from('time_entries').insert({
      worker_id: worker.id,
      entry_date: values.entry_date,
      hours_worked: parseFloat(values.hours_worked) || 0,
      details: values.details || null,
      hourly_rate: worker.default_hourly_rate,
      previous_due: 0,
      paid_status: 'UNPAID',
      remarks: null,
    });
    if (error) { setError(error.message); return; }
    await load();
  }

  if (loading) return <p>Loading…</p>;
  if (!worker) return <p>Could not load your profile.</p>;

  return (
    <main>
      {error && (
        <div className="banner-error" onClick={() => setError(null)}>
          {error} (click to dismiss)
        </div>
      )}

      <SummaryCards entries={entries} />

      <section className="panel">
        <h2>Log today's hours</h2>
        <WorkerEntryForm hourlyRate={worker.default_hourly_rate} onSubmit={handleSubmit} />
      </section>

      <section className="panel">
        <h2>Your entries</h2>
        <EntryTable entries={entries} readOnly />
      </section>
    </main>
  );
}
