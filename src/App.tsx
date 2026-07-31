import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from './lib/supabase';
import type { Profile } from './lib/types';
import Login from './components/Login';
import SetPassword from './components/SetPassword';
import AdminApp from './components/AdminApp';
import WorkerApp from './components/WorkerApp';
import './App.css';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(
    () => /type=invite|type=recovery/.test(window.location.hash)
  );

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

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
    if (!session) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setProfileError(error.message);
        setProfile(data);
        setProfileLoading(false);
      });
  }, [session]);

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

      {profileLoading ? (
        <p>Loading…</p>
      ) : profileError ? (
        <p className="empty-state">{profileError}</p>
      ) : !profile ? (
        <p className="empty-state">
          Your account isn't set up yet. Ask the admin to link your login to a worker profile.
        </p>
      ) : profile.role === 'admin' ? (
        <AdminApp />
      ) : profile.worker_id ? (
        <WorkerApp workerId={profile.worker_id} />
      ) : (
        <p className="empty-state">Your account isn't linked to a worker yet.</p>
      )}
    </div>
  );
}

export default App;
