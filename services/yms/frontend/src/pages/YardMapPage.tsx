import { useState } from 'react';
import { usePolling } from '../hooks/usePolling';
import { getYardSpots, getDockDoors, assignYardSpot, clearYardSpot, moveTrailer } from '../api/client';
import type { YardSpot, DockDoor, YardSpotAssignment, TrailerMove } from '../types';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';

const ZONES = ['A', 'B', 'C'] as const;
const ZONE_LABELS: Record<string, string> = { A: 'Zone A - Staging', B: 'Zone B - Overflow', C: 'Zone C - Long-Term' };

const emptyAssignment: YardSpotAssignment = {
  trailer: '',
  trailerType: '',
  loadStatus: '',
  company: '',
  customer: '',
  driverName: '',
};

export default function YardMapPage() {
  const spots = usePolling(getYardSpots, 30000);
  const doors = usePolling(getDockDoors, 30000);

  const [assignSpot, setAssignSpot] = useState<YardSpot | null>(null);
  const [spotForm, setSpotForm] = useState<YardSpotAssignment>({ ...emptyAssignment });
  const [occupiedSpot, setOccupiedSpot] = useState<YardSpot | null>(null);
  const [showMove, setShowMove] = useState(false);
  const [moveForm, setMoveForm] = useState<TrailerMove>({ fromType: 'spot', fromId: '', toType: 'spot', toId: '' });
  const [submitting, setSubmitting] = useState(false);

  const spotData = spots.data ?? [];
  const doorData = doors.data ?? [];

  const handleAssign = async () => {
    if (!assignSpot) return;
    setSubmitting(true);
    try {
      await assignYardSpot(assignSpot.id, spotForm);
      setAssignSpot(null);
      setSpotForm({ ...emptyAssignment });
      spots.refetch();
    } catch {
      // error
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = async (spot: YardSpot) => {
    try {
      await clearYardSpot(spot.id);
      setOccupiedSpot(null);
      spots.refetch();
    } catch {
      // error
    }
  };

  const handleMove = async () => {
    setSubmitting(true);
    try {
      await moveTrailer(moveForm);
      setShowMove(false);
      spots.refetch();
      doors.refetch();
    } catch {
      // error
    } finally {
      setSubmitting(false);
    }
  };

  const openMoveFromSpot = (spot: YardSpot) => {
    setOccupiedSpot(null);
    setMoveForm({ fromType: 'spot', fromId: spot.id, toType: 'spot', toId: '' });
    setShowMove(true);
  };

  if (spots.loading && !spots.data) return <LoadingSpinner />;

  const inputClass =
    'w-full bg-cl-navy border border-cl-panel rounded-lg px-3 py-2 text-sm text-cl-text placeholder:text-cl-muted focus:outline-none focus:border-cl-accent';

  // Available destinations
  const emptySpots = spotData.filter((s) => s.status === 'empty');
  const availableDoors = doorData.filter((d) => d.status === 'available');

  return (
    <div>
      <PageHeader
        title="Yard Map"
        description="Visual overview of all yard spots by zone"
        action={{
          label: 'Move Trailer',
          onClick: () => {
            setMoveForm({ fromType: 'spot', fromId: '', toType: 'spot', toId: '' });
            setShowMove(true);
          },
        }}
      />

      {ZONES.map((zone) => {
        const zoneSpots = spotData.filter((s) => s.zone === zone);
        const occupied = zoneSpots.filter((s) => s.status === 'occupied').length;
        return (
          <div key={zone} className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-lg font-semibold text-cl-text">{ZONE_LABELS[zone]}</h2>
              <span className="text-xs text-cl-muted bg-cl-panel/50 rounded-full px-2.5 py-0.5">
                {occupied}/{zoneSpots.length} occupied
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {zoneSpots.map((spot) => {
                const isOccupied = spot.status === 'occupied';
                return (
                  <button
                    key={spot.id}
                    onClick={() => {
                      if (isOccupied) setOccupiedSpot(spot);
                      else {
                        setAssignSpot(spot);
                        setSpotForm({ ...emptyAssignment });
                      }
                    }}
                    className={`rounded-xl p-3 text-left transition-all border-2 ${
                      isOccupied
                        ? 'bg-cl-dark border-cl-accent/40 hover:border-cl-accent'
                        : 'bg-cl-dark border-cl-success/30 hover:border-cl-success'
                    }`}
                  >
                    <p className="text-sm font-bold text-cl-text">
                      {zone}-{spot.number}
                    </p>
                    {isOccupied ? (
                      <p className="text-xs text-cl-accent mt-0.5 truncate">{spot.trailer}</p>
                    ) : (
                      <p className="text-xs text-cl-success mt-0.5">Empty</p>
                    )}
                  </button>
                );
              })}
              {zoneSpots.length === 0 && (
                <p className="col-span-6 text-cl-muted text-sm py-4">No spots in this zone.</p>
              )}
            </div>
          </div>
        );
      })}

      {/* Occupied Spot Options */}
      <Modal
        open={!!occupiedSpot}
        onClose={() => setOccupiedSpot(null)}
        title={`Spot ${occupiedSpot?.zone}-${occupiedSpot?.number}`}
        footer={
          <div className="flex gap-2 w-full">
            <button
              onClick={() => occupiedSpot && handleClear(occupiedSpot)}
              className="flex-1 px-4 py-2 text-sm rounded-lg bg-cl-danger/20 text-cl-danger hover:bg-cl-danger/30 transition-colors"
            >
              Clear Spot
            </button>
            <button
              onClick={() => occupiedSpot && openMoveFromSpot(occupiedSpot)}
              className="flex-1 px-4 py-2 text-sm rounded-lg bg-cl-accent text-white hover:bg-cl-accent/90 transition-colors"
            >
              Move Trailer
            </button>
          </div>
        }
      >
        {occupiedSpot && (
          <div className="space-y-2 text-sm">
            <p><span className="text-cl-muted">Trailer:</span> {occupiedSpot.trailer}</p>
            <p><span className="text-cl-muted">Type:</span> {occupiedSpot.trailer_type ?? '-'}</p>
            <p><span className="text-cl-muted">Company:</span> {occupiedSpot.company ?? '-'}</p>
            <p><span className="text-cl-muted">Customer:</span> {occupiedSpot.customer ?? '-'}</p>
            <p><span className="text-cl-muted">Driver:</span> {occupiedSpot.driver_name ?? '-'}</p>
            <p><span className="text-cl-muted">Load:</span> {occupiedSpot.load_status ?? '-'}</p>
          </div>
        )}
      </Modal>

      {/* Assign Spot Modal */}
      <Modal
        open={!!assignSpot}
        onClose={() => setAssignSpot(null)}
        title={`Assign Spot ${assignSpot?.zone}-${assignSpot?.number}`}
        footer={
          <>
            <button
              onClick={() => setAssignSpot(null)}
              className="px-4 py-2 text-sm rounded-lg border border-cl-panel text-cl-text-secondary hover:bg-cl-surface/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={submitting || !spotForm.trailer}
              className="px-4 py-2 text-sm rounded-lg bg-cl-accent text-white hover:bg-cl-accent/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Assigning...' : 'Assign'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-cl-muted mb-1">Trailer *</label>
            <input className={inputClass} placeholder="Trailer #" value={spotForm.trailer} onChange={(e) => setSpotForm({ ...spotForm, trailer: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-cl-muted mb-1">Trailer Type</label>
            <select className={inputClass} value={spotForm.trailerType ?? ''} onChange={(e) => setSpotForm({ ...spotForm, trailerType: e.target.value })}>
              <option value="">Select...</option>
              <option value="Dry Van">Dry Van</option>
              <option value="Reefer">Reefer</option>
              <option value="Flatbed">Flatbed</option>
              <option value="Tanker">Tanker</option>
              <option value="Container">Container</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-cl-muted mb-1">Company</label>
            <input className={inputClass} placeholder="Company" value={spotForm.company ?? ''} onChange={(e) => setSpotForm({ ...spotForm, company: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-cl-muted mb-1">Driver</label>
            <input className={inputClass} placeholder="Driver name" value={spotForm.driverName ?? ''} onChange={(e) => setSpotForm({ ...spotForm, driverName: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Move Trailer Modal */}
      <Modal
        open={showMove}
        onClose={() => setShowMove(false)}
        title="Move Trailer"
        footer={
          <>
            <button
              onClick={() => setShowMove(false)}
              className="px-4 py-2 text-sm rounded-lg border border-cl-panel text-cl-text-secondary hover:bg-cl-surface/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              disabled={submitting || !moveForm.fromId || !moveForm.toId}
              className="px-4 py-2 text-sm rounded-lg bg-cl-accent text-white hover:bg-cl-accent/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Moving...' : 'Move'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-cl-muted mb-1">From</label>
            <div className="flex gap-2">
              <select className={inputClass} value={moveForm.fromType} onChange={(e) => setMoveForm({ ...moveForm, fromType: e.target.value as 'spot' | 'door', fromId: '' })}>
                <option value="spot">Yard Spot</option>
                <option value="door">Dock Door</option>
              </select>
              <select className={inputClass} value={moveForm.fromId} onChange={(e) => setMoveForm({ ...moveForm, fromId: e.target.value })}>
                <option value="">Select...</option>
                {moveForm.fromType === 'spot'
                  ? spotData.filter((s) => s.status === 'occupied').map((s) => (
                      <option key={s.id} value={s.id}>{s.zone}-{s.number} ({s.trailer})</option>
                    ))
                  : doorData.filter((d) => d.status === 'occupied').map((d) => (
                      <option key={d.id} value={d.id}>Door #{d.number} ({d.current_trailer})</option>
                    ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-cl-muted mb-1">To</label>
            <div className="flex gap-2">
              <select className={inputClass} value={moveForm.toType} onChange={(e) => setMoveForm({ ...moveForm, toType: e.target.value as 'spot' | 'door', toId: '' })}>
                <option value="spot">Yard Spot</option>
                <option value="door">Dock Door</option>
              </select>
              <select className={inputClass} value={moveForm.toId} onChange={(e) => setMoveForm({ ...moveForm, toId: e.target.value })}>
                <option value="">Select...</option>
                {moveForm.toType === 'spot'
                  ? emptySpots.map((s) => (
                      <option key={s.id} value={s.id}>{s.zone}-{s.number}</option>
                    ))
                  : availableDoors.map((d) => (
                      <option key={d.id} value={d.id}>Door #{d.number}</option>
                    ))}
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
