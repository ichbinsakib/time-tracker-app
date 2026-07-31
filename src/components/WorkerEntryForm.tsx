import { useState } from 'react';
import { formatBDT } from '../lib/types';

export interface WorkerEntryValues {
  entry_date: string;
  hours_worked: string;
  details: string;
}

export default function WorkerEntryForm({
  hourlyRate,
  onSubmit,
}: {
  hourlyRate: number;
  onSubmit: (values: WorkerEntryValues) => Promise<void>;
}) {
  const [values, setValues] = useState<WorkerEntryValues>({
    entry_date: new Date().toISOString().slice(0, 10),
    hours_worked: '',
    details: '',
  });
  const [saving, setSaving] = useState(false);

  const payablePreview = (parseFloat(values.hours_worked) || 0) * hourlyRate;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(values);
      setValues({ entry_date: new Date().toISOString().slice(0, 10), hours_worked: '', details: '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          Date
          <input
            type="date"
            required
            value={values.entry_date}
            onChange={(e) => setValues({ ...values, entry_date: e.target.value })}
          />
        </label>
        <label>
          Hours worked
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={values.hours_worked}
            onChange={(e) => setValues({ ...values, hours_worked: e.target.value })}
          />
        </label>
        <label className="grow">
          Work details
          <input
            type="text"
            value={values.details}
            onChange={(e) => setValues({ ...values, details: e.target.value })}
          />
        </label>
      </div>
      <div className="form-footer">
        <span className="payable-preview">
          Rate: {formatBDT(hourlyRate)}/hr — You'll earn: <strong>{formatBDT(payablePreview)}</strong>
        </span>
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Add entry'}
          </button>
        </div>
      </div>
    </form>
  );
}
