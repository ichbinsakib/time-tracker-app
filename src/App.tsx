import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from './lib/supabase';
import type { PaidStatus, TimeEntry, Worker } from './lib/types';
import Login from './components/Login';
import SetPassword from './components/SetPassword';
import SummaryCards from './components/SummaryCards';
import EntryForm, { type EntryFormValues } from './components/EntryForm';
import EntryTable from './components/EntryTable';
import './App.css';

type StatusFilter = 'ALL' | PaidStatus;

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(
    () => /type=invite|type=recovery/.test(window.location.hash)
  );

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [activeWorkerId, setActiveWorkerId] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [newWorkerName, setNewWorkerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    loadWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!activeWorkerId) return;
    loadEntries(activeWorkerId);
  }, [activeWorkerId]);

  async function loadWorkers() {
    const { data, error } = await supabase.from('workers').select('*').order('name');
    if (error) { setError(error.message); return; }
    setWorkers(data || []);
    if (data && data.length > 0 && !activeWorkerId) {
      setActiveWorkerId(data[0].id);
    }
  }

  async function loadEntries(workerId: string) {
    setLoadingEntries(true);
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('worker_id', workerId)
      .order('entry_date', { ascending: false });
    if (error) setError(error.message);
    setEntries(data || []);
    setLoadingEntries(false);
  }

  const activeWorker = useMemo(
    () => workers.find((w) => w.id === activeWorkerId) || null,
    [workers, activeWorkerId]
  );

  const filteredEntries = useMemo(() => {
    if (statusFilter === 'ALL') return entries;
    return entries.filter((e) => e.paid_status === statusFilter);
  }, [entries, statusFilter]);

  async function handleAddWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!newWorkerName.trim()) return;
    const { data, error } = await supabase
      .from('workers')
      .insert({ name: newWorkerName.trim(), default_hourly_rate: 0 })
      .select()
      .single();
    if (error) { setError(error.message); return; }
    setNewWorkerName('');
    await loadWorkers();
    if (data) setActiveWorkerId(data.id);
  }

  async function handleSubmitEntry(values: EntryFormValues) {
    if (!activeWorkerId) return;
    const payload = {
      worker_id: activeWorkerId,
      entry_date: values.entry_date,
      hours_worked: parseFloat(values.hours_worked) || 0,
      details: values.details || null,
      hourly_rate: parseFloat(values.hourly_rate) || 0,
      previous_due: parseFloat(values.previous_due) || 0,
      paid_status: values.paid_status,
      remarks: values.remarks || null,
    };

    const { error } = editing
      ? await supabase.from('time_entries').update(payload).eq('id', editing.id)
      : await supabase.from('time_entries').insert(payload);

    if (error) { setError(error.message); return; }
    setEditing(null);
    await loadEntries(activeWorkerId);
  }

  async function handleDelete(entry: TimeEntry) {
    if (!confirm(`Delete the entry for ${entry.entry_date}?`)) return;
    const { error } = await supabase.from('time_entries').delete().eq('id', entry.id);
    if (error) { setError(error.message); return; }
    if (activeWorkerId) await loadEntries(activeWorkerId);
  }

  async function handleTogglePaid(entry: TimeEntry) {
    const next: PaidStatus = entry.paid_status === 'PAID' ? 'UNPAID' : 'PAID';
    const { error } = await supabase
      .from('time_entries')
      .update({ paid_status: next })
      .eq('id', entry.id);
    if (error) { setError(error.message); return; }
    if (activeWorkerId) await loadEntries(activeWorkerId);
  }

  if (!supabaseConfigured) {
    return (
      <div className="config-warning">
        <h1>Time Tracker</h1>
        <p>
          Missing Supabase configuration. Copy <code>.env.example</code> to <code>.env</code>{' '}
          and fill in <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>{' '}
          from your Supabase project settings, then restart the dev server.
        </p>
      </div>
    );
  }

  if (authLoading) return <div className="loading-screen">Loading…</div>;

  if (needsPasswordSetup && session) {
    return (
      <SetPassword
        onDone={() => {
          window.history.replaceState(null, '', window.location.pathname);
          setNeedsPasswordSetup(false);
        }}
      />
    );
  }

  if (!session) return <Login />;

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Time Tracker</h1>
        <button className="secondary" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>

      <nav className="worker-tabs">
        {workers.map((w) => (
          <button
            key={w.id}
            className={w.id === activeWorkerId ? 'active' : ''}
            onClick={() => setActiveWorkerId(w.id)}
          >
            {w.name}
          </button>
        ))}
        <form className="add-worker" onSubmit={handleAddWorker}>
          <input
            placeholder="New worker name"
            value={newWorkerName}
            onChange={(e) => setNewWorkerName(e.target.value)}
          />
          <button type="submit">+ Add</button>
        </form>
      </nav>

      {error && (
        <div className="banner-error" onClick={() => setError(null)}>
          {error} (click to dismiss)
        </div>
      )}

      {activeWorker && (
        <main>
          <SummaryCards entries={entries} />

          <section className="panel">
            <h2>{editing ? `Edit entry — ${activeWorker.name}` : `Add entry — ${activeWorker.name}`}</h2>
            <EntryForm
              defaultRate={activeWorker.default_hourly_rate}
              editing={editing}
              onCancelEdit={() => setEditing(null)}
              onSubmit={handleSubmitEntry}
            />
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Entries</h2>
              <div className="filter-group">
                {(['ALL', 'UNPAID', 'PAID'] as StatusFilter[]).map((f) => (
                  <button
                    key={f}
                    className={statusFilter === f ? 'active' : ''}
                    onClick={() => setStatusFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {loadingEntries ? (
              <p>Loading…</p>
            ) : (
              <EntryTable
                entries={filteredEntries}
                onEdit={setEditing}
                onDelete={handleDelete}
                onTogglePaid={handleTogglePaid}
              />
            )}
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
