import { usePolling } from '../hooks/usePolling';
import { getGateLog, getDockDoors, getYardSpots } from '../api/client';
import type { GateEntry, DockDoor, YardSpot } from '../types';
import KpiCard from '../components/KpiCard';
import DataTable, { type Column } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const gateColumns: Column<GateEntry>[] = [
  { key: 'trailer_id', label: 'Trailer' },
  { key: 'driver_name', label: 'Driver' },
  { key: 'trucking_company', label: 'Company' },
  {
    key: 'direction',
    label: 'Direction',
    render: (r) => <StatusBadge status={r.direction} />,
  },
  {
    key: 'status',
    label: 'Status',
    render: (r) => <StatusBadge status={r.status} />,
  },
  {
    key: 'arrival',
    label: 'Time',
    render: (r) => <span className="text-xs">{formatTime(r.arrival)}</span>,
  },
];

function doorStatusColor(status: string) {
  if (status === 'available') return 'bg-cl-success';
  if (status === 'occupied') return 'bg-cl-accent';
  return 'bg-cl-warning';
}

export default function DashboardPage() {
  const gate = usePolling<{ data: GateEntry[]; count: number | null }>(() => getGateLog({ limit: 100 }), 30000);
  const doors = usePolling<DockDoor[]>(getDockDoors, 30000);
  const spots = usePolling<YardSpot[]>(getYardSpots, 30000);

  if (gate.loading && !gate.data) return <LoadingSpinner />;

  const gateData = gate.data?.data ?? [];
  const doorData = doors.data ?? [];
  const spotData = spots.data ?? [];

  const trailersOnSite = gateData.filter((g) => g.status === 'On Site').length;
  const occupiedDoors = doorData.filter((d) => d.status === 'occupied').length;
  const totalDoors = doorData.length;
  const occupiedSpots = spotData.filter((s) => s.status === 'occupied').length;
  const totalSpots = spotData.length;
  const emptySpots = spotData.filter((s) => s.status === 'empty').length;
  const dockUtil = totalDoors > 0 ? Math.round((occupiedDoors / totalDoors) * 100) : 0;
  const yardOccupancy = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-cl-text mb-6">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Trailers On Site" value={trailersOnSite} />
        <KpiCard label="Dock Utilization" value={`${dockUtil}%`} helper={`${occupiedDoors} of ${totalDoors} doors`} />
        <KpiCard label="Yard Occupancy" value={`${yardOccupancy}%`} helper={`${occupiedSpots} of ${totalSpots} spots`} />
        <KpiCard label="Available Spots" value={emptySpots} />
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Gate Activity */}
        <div className="bg-cl-dark border border-cl-panel rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-cl-panel">
            <h2 className="text-sm font-semibold text-cl-text uppercase tracking-wide">Recent Gate Activity</h2>
          </div>
          <DataTable
            columns={gateColumns}
            data={gateData.slice(0, 10) as unknown as Record<string, unknown>[]}
            emptyMessage="No gate activity yet."
          />
        </div>

        {/* Dock Door Status */}
        <div className="bg-cl-dark border border-cl-panel rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-cl-panel">
            <h2 className="text-sm font-semibold text-cl-text uppercase tracking-wide">Dock Door Status</h2>
          </div>
          <div className="p-4 grid grid-cols-4 gap-3">
            {doorData.map((door) => (
              <div
                key={door.id}
                className="bg-cl-navy/50 border border-cl-panel/50 rounded-lg p-3 text-center"
              >
                <p className="text-lg font-bold text-cl-text">#{door.number}</p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className={`w-2 h-2 rounded-full ${doorStatusColor(door.status)}`} />
                  <span className="text-xs text-cl-text-secondary capitalize">{door.status}</span>
                </div>
              </div>
            ))}
            {doorData.length === 0 && (
              <p className="col-span-4 text-center text-cl-muted text-sm py-8">No dock doors configured.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
