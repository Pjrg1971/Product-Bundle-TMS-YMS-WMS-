import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { api } from '../api/client.ts';
import { useApi } from '../hooks/useApi.ts';
import StatusBadge from '../components/StatusBadge.tsx';
import TimelineView from '../components/TimelineView.tsx';
import type { ShipmentTimeline } from '../api/client.ts';

function formatDate(ts: string): string {
  if (!ts) return '--';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const fetcher = useMemo(
    () => () => api.getShipmentTimeline(id!),
    [id]
  );

  const { data, loading, error } = useApi<ShipmentTimeline>(fetcher);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cl-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/shipments')}
          className="text-cl-accent hover:text-cl-accent/80 text-sm font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Shipments
        </button>
        <div className="bg-cl-danger/10 border border-cl-danger/30 rounded-xl p-6 text-cl-danger">
          Failed to load shipment: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/shipments')}
        className="text-cl-accent hover:text-cl-accent/80 text-sm font-medium flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Shipments
      </button>

      {/* Summary Card */}
      <div className="bg-cl-dark border border-cl-panel rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Shipment {data.shipmentId}
            </h1>
            <p className="text-sm text-cl-muted mt-1">
              Load ID: {data.loadId}
            </p>
          </div>
          <StatusBadge status={data.currentStatus} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-cl-muted uppercase tracking-wide">Last Event</p>
            <p className="text-sm text-slate-200 mt-1">{formatDate(data.lastEventAt)}</p>
          </div>
          <div>
            <p className="text-xs text-cl-muted uppercase tracking-wide">ETA</p>
            <p className="text-sm text-slate-200 mt-1">{formatDate(data.etaAt)}</p>
          </div>
          <div>
            <p className="text-xs text-cl-muted uppercase tracking-wide">Milestones</p>
            <p className="text-sm text-slate-200 mt-1">{data.milestones.length}</p>
          </div>
          <div>
            <p className="text-xs text-cl-muted uppercase tracking-wide">Exceptions</p>
            <p className={`text-sm mt-1 ${data.hasExceptions ? 'text-cl-danger font-medium' : 'text-slate-200'}`}>
              {data.hasExceptions ? 'Yes' : 'None'}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <div className="bg-cl-dark border border-cl-panel rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Shipment Timeline
          </h2>
          <TimelineView
            milestones={data.milestones}
            currentStatus={data.currentStatus}
          />
        </div>

        {/* Details Panel */}
        <div className="bg-cl-dark border border-cl-panel rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Shipment Details
          </h2>
          <div className="space-y-4">
            <DetailRow label="Shipment ID" value={data.shipmentId} />
            <DetailRow label="Load ID" value={data.loadId} />
            <DetailRow label="Status" value={data.currentStatus} />
            <DetailRow label="ETA" value={formatDate(data.etaAt)} />
            <DetailRow label="Last Event" value={formatDate(data.lastEventAt)} />
            <DetailRow
              label="Exceptions"
              value={data.hasExceptions ? 'Active exceptions' : 'No exceptions'}
              highlight={data.hasExceptions}
            />
            <DetailRow
              label="Total Milestones"
              value={String(data.milestones.length)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-cl-panel/50 last:border-0">
      <span className="text-sm text-cl-muted">{label}</span>
      <span
        className={`text-sm font-medium ${
          highlight ? 'text-cl-danger' : 'text-slate-200'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
