import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePolling } from '../hooks/usePolling';
import { getDockDoors, assignDockDoor, clearDockDoor } from '../api/client';
import type { DockDoor, DockDoorAssignment } from '../types';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}

const emptyAssignment: DockDoorAssignment = {
  trailer: '',
  driver: '',
  customer: '',
  company: '',
  loadStatus: '',
};

export default function DockDoorsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignDoor, setAssignDoor] = useState<DockDoor | null>(null);
  const [form, setForm] = useState<DockDoorAssignment>({ ...emptyAssignment });
  const [submitting, setSubmitting] = useState(false);
  const [scanTrailer, setScanTrailer] = useState('');
  const [scanExpanded, setScanExpanded] = useState(false);

  const { data, loading, refetch } = usePolling(getDockDoors, 30000);
  const allDoors = data ?? [];

  const doors = allDoors.filter((d) => {
    if (typeFilter && d.type !== typeFilter) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    return true;
  });

  const handleAssign = async () => {
    if (!assignDoor) return;
    setSubmitting(true);
    try {
      await assignDockDoor(assignDoor.id, form);
      setAssignDoor(null);
      setForm({ ...emptyAssignment });
      refetch();
    } catch {
      // error
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = async (door: DockDoor) => {
    try {
      await clearDockDoor(door.id);
      refetch();
    } catch {
      // error
    }
  };

  if (loading && !data) return <LoadingSpinner />;

  const selectClass =
    'bg-cl-dark border border-cl-panel rounded-lg px-3 py-2 text-sm text-cl-text-secondary focus:outline-none focus:border-cl-accent';
  const inputClass =
    'w-full bg-cl-navy border border-cl-panel rounded-lg px-3 py-2 text-sm text-cl-text placeholder:text-cl-muted focus:outline-none focus:border-cl-accent';

  return (
    <div>
      <PageHeader title="Dock Doors" description="Manage dock door assignments and status" />

      {/* Quick Scan Panel */}
      <div className="bg-cl-dark border border-cl-panel rounded-xl mb-6 overflow-hidden">
        <button
          onClick={() => setScanExpanded(!scanExpanded)}
          className="w-full px-5 py-3 flex items-center justify-between text-sm font-medium text-cl-text-secondary hover:text-cl-text transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
            </svg>
            Quick Scan
          </span>
          <svg
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${scanExpanded ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {scanExpanded && (
          <div className="px-5 pb-4 border-t border-cl-panel pt-3">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-cl-muted mb-1">Trailer Number</label>
                <input
                  className={inputClass}
                  placeholder="Scan or enter trailer #"
                  value={scanTrailer}
                  onChange={(e) => setScanTrailer(e.target.value)}
                />
              </div>
              <button className="bg-cl-accent text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-cl-accent/90 transition-colors">
                Start Scan
              </button>
            </div>
            <p className="text-xs text-cl-muted mt-2">
              For the full scanning workflow, go to the{' '}
              <Link to="/scanner" className="text-cl-accent hover:underline">
                Dock Scanner
              </Link>{' '}
              page.
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectClass}>
          <option value="">All Types</option>
          <option value="Inbound">Inbound</option>
          <option value="Outbound">Outbound</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {/* Door Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {doors.map((door) => (
          <div key={door.id} className="bg-cl-dark border border-cl-panel rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xl font-bold text-cl-text">Door #{door.number}</p>
                <StatusBadge status={door.type} size="sm" />
              </div>
              <StatusBadge status={door.status} />
            </div>

            {door.status === 'occupied' && (
              <div className="text-xs space-y-1 mb-3 text-cl-text-secondary">
                <p>
                  <span className="text-cl-muted">Trailer:</span> {door.current_trailer}
                </p>
                <p>
                  <span className="text-cl-muted">Driver:</span> {door.current_driver}
                </p>
                {door.company && (
                  <p>
                    <span className="text-cl-muted">Company:</span> {door.company}
                  </p>
                )}
                {door.load_status && (
                  <p>
                    <span className="text-cl-muted">Load:</span> {door.load_status}
                  </p>
                )}
                {door.assigned_since && (
                  <p>
                    <span className="text-cl-muted">Since:</span> {timeSince(door.assigned_since)}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              {door.status === 'available' && (
                <button
                  onClick={() => {
                    setAssignDoor(door);
                    setForm({ ...emptyAssignment });
                  }}
                  className="flex-1 text-xs bg-cl-accent/20 text-cl-accent rounded-lg px-3 py-1.5 hover:bg-cl-accent/30 transition-colors"
                >
                  Assign
                </button>
              )}
              {door.status === 'occupied' && (
                <button
                  onClick={() => handleClear(door)}
                  className="flex-1 text-xs bg-cl-surface/50 text-cl-text-secondary rounded-lg px-3 py-1.5 hover:bg-cl-surface transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        ))}
        {doors.length === 0 && (
          <p className="col-span-4 text-center text-cl-muted py-12">No dock doors match your filters.</p>
        )}
      </div>

      {/* Assign Modal */}
      <Modal
        open={!!assignDoor}
        onClose={() => setAssignDoor(null)}
        title={`Assign Door #${assignDoor?.number ?? ''}`}
        footer={
          <>
            <button
              onClick={() => setAssignDoor(null)}
              className="px-4 py-2 text-sm rounded-lg border border-cl-panel text-cl-text-secondary hover:bg-cl-surface/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={submitting || !form.trailer || !form.driver}
              className="px-4 py-2 text-sm rounded-lg bg-cl-accent text-white hover:bg-cl-accent/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Assigning...' : 'Assign'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-cl-muted mb-1">Trailer Number *</label>
            <input
              className={inputClass}
              placeholder="e.g. TRL-1234"
              value={form.trailer}
              onChange={(e) => setForm({ ...form, trailer: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-cl-muted mb-1">Driver Name *</label>
            <input
              className={inputClass}
              placeholder="Full name"
              value={form.driver}
              onChange={(e) => setForm({ ...form, driver: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-cl-muted mb-1">Company</label>
            <input
              className={inputClass}
              placeholder="Company"
              value={form.company ?? ''}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-cl-muted mb-1">Customer</label>
            <input
              className={inputClass}
              placeholder="Customer"
              value={form.customer ?? ''}
              onChange={(e) => setForm({ ...form, customer: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-cl-muted mb-1">Load Status</label>
            <select
              className={inputClass}
              value={form.loadStatus ?? ''}
              onChange={(e) => setForm({ ...form, loadStatus: e.target.value })}
            >
              <option value="">Select...</option>
              <option value="Full">Full</option>
              <option value="Partial">Partial</option>
              <option value="Empty">Empty</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
