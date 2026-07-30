export type PaidStatus = 'PAID' | 'UNPAID';

export interface Worker {
  id: string;
  name: string;
  default_hourly_rate: number;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  worker_id: string;
  entry_date: string;
  hours_worked: number;
  details: string | null;
  hourly_rate: number;
  payable_amount: number;
  previous_due: number;
  paid_status: PaidStatus;
  remarks: string | null;
  logged_at: string;
  created_at: string;
}

export type TimeEntryInput = Omit<
  TimeEntry,
  'id' | 'payable_amount' | 'created_at'
>;
