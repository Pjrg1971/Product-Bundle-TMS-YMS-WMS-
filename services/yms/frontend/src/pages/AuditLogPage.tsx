import { useState, useCallback } from 'react';
import { usePolling } from '../hooks/usePolling';
import { getAuditLog } from '../api/client';
import type { AuditEntry } from '../types';
import PageHeader from '../components/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';

const PAGE_SIZE = 50;

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [offset, setOffset] = useState(0);

  const fetcher = useCallback(
    () =>
      getAuditLog({
        limit: PAGE_SIZE,
        offset,
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
      }),
    [actionFilter, entityFilter, offset],
  );

  const { data, loading } = usePolling(fetcher, 60000);
  const entries = data ?? [];

  const columns: Column<AuditEntry>[] = [
    {
      key: 'created_at',
      label: 'Timestamp',
      render: (r) => <span className="text-xs">{formatTimestamp(r.created_at)}</span>,
    },
    {
      key: 'user_id',
      label: 'User',
      render: (r) => <span>{r.profiles?.name ?? r.profiles?.email ?? r.user_id ?? '-'}</span>,
    },
    { key: 'action', label: 'Action' },
    { key: 'entity_type', label: 'Entity Type', render: (r) => <span>{r.entity_type ?? '-'}</span> },
    { key: 'entity_id', label: 'Entity ID', render: (r) => <span className="text-xs font-mono">{r.entity_id ?? '-'}</span> },
    { key: 'ip_address', label: 'IP Address', render: (r) => <span className="text-xs font-mono">{r.ip_address ?? '-'}</span> },
  ];

  if (loading && !data) return <LoadingSpinner />;

  const selectClass =
    'bg-cl-dark border border-cl-panel rounded-lg px-3 py-2 text-sm text-cl-text-secondary focus:outline-none focus:border-cl-accent';

  return (
    <div>
      <PageHeader title="Audit Log" description="Immutable record of all system actions" />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }} className={selectClass}>
          <option value="">All Actions</option>
          <option value="gate_checkin">Gate Check-In</option>
          <option value="gate_checkout">Gate Check-Out</option>
          <option value="gate_delete">Gate Delete</option>
          <option value="door_update">Door Update</option>
          <option value="door_assign">Door Assign</option>
          <option value="door_clear">Door Clear</option>
          <option value="spot_update">Spot Update</option>
          <option value="spot_assign">Spot Assign</option>
          <option value="spot_clear">Spot Clear</option>
          <option value="trailer_move">Trailer Move</option>
        </select>
        <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setOffset(0); }} className={selectClass}>
          <option value="">All Entity Types</option>
          <option value="gate_log">Gate Log</option>
          <option value="dock_door">Dock Door</option>
          <option value="yard_spot">Yard Spot</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-cl-dark border border-cl-panel rounded-xl overflow-hidden">
        <DataTable
          columns={columns}
          data={entries as unknown as Record<string, unknown>[]}
          emptyMessage="No audit entries found."
        />
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          disabled={offset === 0}
          className="px-4 py-2 text-sm rounded-lg border border-cl-panel text-cl-text-secondary hover:bg-cl-surface/30 disabled:opacity-30 transition-colors"
        >
          Previous
        </button>
        <span className="text-sm text-cl-muted">
          Showing {offset + 1} - {offset + entries.length}
        </span>
        <button
          onClick={() => setOffset(offset + PAGE_SIZE)}
          disabled={entries.length < PAGE_SIZE}
          className="px-4 py-2 text-sm rounded-lg border border-cl-panel text-cl-text-secondary hover:bg-cl-surface/30 disabled:opacity-30 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
