import { formatBDT, type TimeEntry } from '../lib/types';

export default function EntryTable({
  entries,
  onEdit,
  onDelete,
  onTogglePaid,
}: {
  entries: TimeEntry[];
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
  onTogglePaid: (entry: TimeEntry) => void;
}) {
  if (entries.length === 0) {
    return <p className="empty-state">No entries yet. Add one above.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Hours</th>
            <th>Details</th>
            <th>Rate</th>
            <th>Payable</th>
            <th>Prev. due</th>
            <th>Status</th>
            <th>Remarks</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className={entry.paid_status === 'UNPAID' ? 'unpaid-row' : ''}>
              <td>{entry.entry_date}</td>
              <td>{entry.hours_worked}</td>
              <td className="details-cell">{entry.details}</td>
              <td>{formatBDT(Number(entry.hourly_rate))}</td>
              <td>{formatBDT(Number(entry.payable_amount))}</td>
              <td>{entry.previous_due ? formatBDT(Number(entry.previous_due)) : ''}</td>
              <td>
                <button
                  className={`status-pill ${entry.paid_status.toLowerCase()}`}
                  onClick={() => onTogglePaid(entry)}
                  title="Click to toggle paid/unpaid"
                >
                  {entry.paid_status}
                </button>
              </td>
              <td className="details-cell">{entry.remarks}</td>
              <td className="row-actions">
                <button className="link-btn" onClick={() => onEdit(entry)}>
                  Edit
                </button>
                <button className="link-btn danger" onClick={() => onDelete(entry)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
