import { useState, useCallback } from 'react';
import { usePolling } from '../hooks/usePolling';
import { getGateLog, createGateEntry, checkoutGateEntry } from '../api/client';
import type { GateEntry, CreateGateEntry } from '../types';
import PageHeader from '../components/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const emptyForm: CreateGateEntry = {
  trailer_id: '',
  driver_name: '',
  trucking_company: '',
  direction: 'Inbound',
  trailer_type: undefined,
  load_status: undefined,
  seal_number: undefined,
  po_number: undefined,
  notes: undefined,
};

export default function GateLogPage() {
  const [directionFilter, setDirectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [form, setForm] = useState<CreateGateEntry>({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const fetcher = useCallback(
    () =>
      getGateLog({
        direction: directionFilter || undefined,
        status: statusFilter || undefined,
      }),
    [directionFilter, statusFilter],
  );

  const { data, loading, refetch } = usePolling(fetcher, 30000);
  const entries = data?.data ?? [];

  const handleCheckIn = async () => {
    setSubmitting(true);
    try {
      await createGateEntry(form);
      setShowCheckIn(false);
      setForm({ ...emptyForm });
      refetch();
    } catch {
      // error handling would go here
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async (id: string) => {
    try {
      await checkoutGateEntry(id);
      refetch();
    } catch {
      // error handling
    }
  };

  const columns: Column<GateEntry>[] = [
    { key: 'trailer_id', label: 'Trailer ID' },
    { key: 'driver_name', label: 'Driver' },
    { key: 'trucking_company', label: 'Company' },
    {
      key: 'direction',
      label: 'Direction',
      render: (r) => <StatusBadge status={r.direction} />,
    },
    { key: 'load_status', label: 'Load Status', render: (r) => <span>{r.load_status ?? '-'}</span> },
    {
      key: 'arrival',
      label: 'Arrival',
      render: (r) => <span className="text-xs">{formatDate(r.arrival)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) =>
        r.status === 'On Site' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCheckout(r.id);
            }}
            className="text-xs bg-cl-surface/50 hover:bg-cl-surface text-cl-text-secondary hover:text-cl-text px-3 py-1 rounded-md transition-colors"
          >
            Check Out
          </button>
        ) : (
          <span className="text-xs text-cl-muted">-</span>
        ),
    },
  ];

  if (loading && !data) return <LoadingSpinner />;

  const inputClass =
    'w-full bg-cl-navy border border-cl-panel rounded-lg px-3 py-2 text-sm text-cl-text placeholder:text-cl-muted focus:outline-none focus:border-cl-accent';
  const selectClass =
    'bg-cl-dark border border-cl-panel rounded-lg px-3 py-2 text-sm text-cl-text-secondary focus:outline-none focus:border-cl-accent';

  return (
    <div>
      <PageHeader
        title="Gate Log"
        description="Track all truck arrivals and departures"
        action={{ label: 'Check In', onClick: () => setShowCheckIn(true) }}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value)} className={selectClass}>
          <option value="">All Directions</option>
          <option value="Inbound">Inbound</option>
          <option value="Outbound">Outbound</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
          <option value="">All Statuses</option>
          <option value="On Site">On Site</option>
          <option value="Departed">Departed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-cl-dark border border-cl-panel rounded-xl overflow-hidden">
        <DataTable
          columns={columns}
          data={entries as unknown as Record<string, unknown>[]}
          emptyMessage="No gate entries found."
        />
      </div>

      {/* Check In Modal */}
      <Modal
        open={showCheckIn}
        onClose={() => setShowCheckIn(false)}
        title="Check In Truck"
        footer={
          <>
            <button
              onClick={() => setShowCheckIn(false)}
              className="px-4 py-2 text-sm rounded-lg border border-cl-panel text-cl-text-secondary hover:bg-cl-surface/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCheckIn}
              disabled={submitting || !form.trailer_id || !form.driver_name || !form.trucking_company}
              className="px-4 py-2 text-sm rounded-lg bg-cl-accent text-white hover:bg-cl-accent/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Checking In...' : 'Check In'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-cl-muted mb-1">Trailer ID *</label>
            <input
              className={inputClass}
              placeholder="e.g. TRL-1234"
              value={form.trailer_id}
              onChange={(e) => setForm({ ...form, trailer_id: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-cl-muted mb-1">Driver Name *</label>
            <input
              className={inputClass}
              placeholder="Full name"
              value={form.driver_name}
              onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-cl-muted mb-1">Trucking Company *</label>
            <input
              className={inputClass}
              placeholder="Company name"
              value={form.trucking_company}
              onChange={(e) => setForm({ ...form, trucking_company: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-cl-muted mb-1">Direction</label>
            <select
              className={inputClass}
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value as 'Inbound' | 'Outbound' })}
            >
              <option value="Inbound">Inbound</option>
              <option value="Outbound">Outbound</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-cl-muted mb-1">Trailer Type</label>
            <select
              className={inputClass}
              value={form.trailer_type ?? ''}
              onChange={(e) => setForm({ ...form, trailer_type: e.target.value || undefined })}
            >
              <option value="">Select...</option>
              <option value="Dry Van">Dry Van</option>
              <option value="Reefer">Reefer</option>
              <option value="Flatbed">Flatbed</option>
              <option value="Tanker">Tanker</option>
              <option value="Container">Container</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-cl-muted mb-1">Load Status</label>
            <select
              className={inputClass}
              value={form.load_status ?? ''}
              onChange={(e) => setForm({ ...form, load_status: e.target.value || undefined })}
            >
              <option value="">Select...</option>
              <option value="Full">Full</option>
              <option value="Partial">Partial</option>
              <option value="Empty">Empty</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-cl-muted mb-1">Seal Number</label>
            <input
              className={inputClass}
              placeholder="Seal #"
              value={form.seal_number ?? ''}
              onChange={(e) => setForm({ ...form, seal_number: e.target.value || undefined })}
            />
          </div>
          <div>
            <label className="block text-xs text-cl-muted mb-1">PO Number</label>
            <input
              className={inputClass}
              placeholder="PO #"
              value={form.po_number ?? ''}
              onChange={(e) => setForm({ ...form, po_number: e.target.value || undefined })}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-cl-muted mb-1">Notes</label>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="Additional notes..."
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value || undefined })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
