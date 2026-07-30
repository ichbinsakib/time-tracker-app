import { formatBDT, type TimeEntry } from '../lib/types';

export default function SummaryCards({ entries }: { entries: TimeEntry[] }) {
  const totalHours = entries.reduce((s, e) => s + Number(e.hours_worked || 0), 0);
  const totalPayable = entries.reduce((s, e) => s + Number(e.payable_amount || 0), 0);
  const paid = entries.filter((e) => e.paid_status === 'PAID');
  const unpaid = entries.filter((e) => e.paid_status === 'UNPAID');
  const totalPaid = paid.reduce((s, e) => s + Number(e.payable_amount || 0), 0);
  const totalUnpaid = unpaid.reduce((s, e) => s + Number(e.payable_amount || 0), 0);
  const totalPrevDue = entries.reduce((s, e) => s + Number(e.previous_due || 0), 0);

  const cards = [
    { label: 'Total hours', value: totalHours.toFixed(2) },
    { label: 'Total payable', value: formatBDT(totalPayable) },
    { label: 'Paid', value: formatBDT(totalPaid), sub: `${paid.length} entries` },
    { label: 'Unpaid (due)', value: formatBDT(totalUnpaid + totalPrevDue), sub: `${unpaid.length} entries`, warn: totalUnpaid + totalPrevDue > 0 },
  ];

  return (
    <div className="summary-cards">
      {cards.map((c) => (
        <div className={`card ${c.warn ? 'warn' : ''}`} key={c.label}>
          <div className="card-label">{c.label}</div>
          <div className="card-value">{c.value}</div>
          {c.sub && <div className="card-sub">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}
