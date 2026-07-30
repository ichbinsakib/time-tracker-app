import { useEffect, useState } from 'react';
import type { PaidStatus, TimeEntry } from '../lib/types';

export interface EntryFormValues {
  entry_date: string;
  hours_worked: string;
  details: string;
  hourly_rate: string;
  previous_due: string;
  paid_status: PaidStatus;
  remarks: string;
}

const emptyForm = (defaultRate: number): EntryFormValues => ({
  entry_date: new Date().toISOString().slice(0, 10),
  hours_worked: '',
  details: '',
  hourly_rate: String(defaultRate),
  previous_due: '',
  paid_status: 'UNPAID',
  remarks: '',
});

export default function EntryForm({
  defaultRate,
  editing,
  onCancelEdit,
  onSubmit,
}: {
  defaultRate: number;
  editing: TimeEntry | null;
  onCancelEdit: () => void;
  onSubmit: (values: EntryFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<EntryFormValues>(emptyForm(defaultRate));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setValues({
        entry_date: editing.entry_date,
        hours_worked: String(editing.hours_worked),
        details: editing.details || '',
        hourly_rate: String(editing.hourly_rate),
        previous_due: String(editing.previous_due || ''),
        paid_status: editing.paid_status,
        remarks: editing.remarks || '',
      });
    } else {
      setValues(emptyForm(defaultRate));
    }
  }, [editing, defaultRate]);

  const payablePreview =
    (parseFloat(values.hours_worked) || 0) * (parseFloat(values.hourly_rate) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(values);
      if (!editing) setValues(emptyForm(defaultRate));
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
        <label>
          Hourly rate
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={values.hourly_rate}
            onChange={(e) => setValues({ ...values, hourly_rate: e.target.value })}
          />
        </label>
        <label>
          Status
          <select
            value={values.paid_status}
            onChange={(e) =>
              setValues({ ...values, paid_status: e.target.value as PaidStatus })
            }
          >
            <option value="UNPAID">Unpaid</option>
            <option value="PAID">Paid</option>
          </select>
        </label>
      </div>
      <div className="form-row">
        <label className="grow">
          Work details
          <input
            type="text"
            value={values.details}
            onChange={(e) => setValues({ ...values, details: e.target.value })}
          />
        </label>
        <label>
          Previous due
          <input
            type="number"
            step="0.01"
            value={values.previous_due}
            onChange={(e) => setValues({ ...values, previous_due: e.target.value })}
          />
        </label>
      </div>
      <div className="form-row">
        <label className="grow">
          Remarks
          <input
            type="text"
            value={values.remarks}
            onChange={(e) => setValues({ ...values, remarks: e.target.value })}
          />
        </label>
      </div>
      <div className="form-footer">
        <span className="payable-preview">
          Payable: <strong>${payablePreview.toFixed(2)}</strong>
        </span>
        <div className="form-actions">
          {editing && (
            <button type="button" className="secondary" onClick={onCancelEdit}>
              Cancel
            </button>
          )}
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Update entry' : 'Add entry'}
          </button>
        </div>
      </div>
    </form>
  );
}
