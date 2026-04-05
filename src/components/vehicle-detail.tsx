'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrafficLight } from './traffic-light';
import { VehicleAvatar } from './vehicle-avatar';
import { VehicleMiniMap } from './vehicle-mini-map';
import { TripsTab } from './trips-tab';
import { MaintenanceTab } from './maintenance-tab';
import { InspectionsTab } from './inspections-tab';
import { createVehicleSchema } from '@/lib/validators';

export interface VehicleDetailData {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  vin: string | null;
  licensePlate: string;
  color: string | null;
  photoUrl: string | null;
  status: string;
  odometer: number;
  motionState: string;
  trafficLight: 'GREEN' | 'ORANGE' | 'RED';
  latestPosition: {
    latitude: number;
    longitude: number;
    speed: number | null;
    heading: number | null;
    timestamp: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface EditFormData {
  name: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  licensePlate: string;
  color: string;
  odometer: string;
  status: string;
}

interface EditFormErrors {
  name?: string;
  make?: string;
  model?: string;
  year?: string;
  vin?: string;
  licensePlate?: string;
  odometer?: string;
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'trips', label: 'Trips' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'inspections', label: 'Inspections' },
  { id: 'documents', label: 'Documents' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const TRAFFIC_LIGHT_LABELS: Record<string, string> = {
  GREEN: 'All clear',
  ORANGE: 'Requires attention',
  RED: 'Overdue',
};

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'IN_SHOP', label: 'In Shop' },
  { value: 'DECOMMISSIONED', label: 'Decommissioned' },
];

interface VehicleDetailProps {
  vehicle: VehicleDetailData;
}

export function VehicleDetail({ vehicle: initialVehicle }: VehicleDetailProps) {
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [formData, setFormData] = useState<EditFormData>(vehicleToFormData(vehicle));
  const [fieldErrors, setFieldErrors] = useState<EditFormErrors>({});

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!errorToast) return;
    const timer = setTimeout(() => setErrorToast(null), 5000);
    return () => clearTimeout(timer);
  }, [errorToast]);

  function handleEdit() {
    setFormData(vehicleToFormData(vehicle));
    setFieldErrors({});
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
  }

  function validateForm(): boolean {
    const result = createVehicleSchema.safeParse({
      name: formData.name.trim(),
      make: formData.make.trim(),
      model: formData.model.trim(),
      year: parseInt(formData.year, 10) || 0,
      vin: formData.vin.trim(),
      licensePlate: formData.licensePlate.trim(),
      color: formData.color.trim(),
      odometer: parseInt(formData.odometer, 10) || 0,
    });

    if (result.success) {
      setFieldErrors({});
      return true;
    }

    const fe = result.error.flatten().fieldErrors;
    setFieldErrors({
      name: fe.name?.[0] ? 'Vehicle name is required' : undefined,
      make: fe.make?.[0] ? 'Make is required' : undefined,
      model: fe.model?.[0] ? 'Model is required' : undefined,
      year: fe.year?.[0] ? 'Valid year is required' : undefined,
      vin: fe.vin?.[0] ? 'VIN must be 17 characters (A-Z, 0-9, no I/O/Q)' : undefined,
      licensePlate: fe.licensePlate?.[0] ? 'License plate is required' : undefined,
      odometer: fe.odometer?.[0] ? 'Odometer must be 0 or more' : undefined,
    });
    return false;
  }

  async function handleSave() {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        make: formData.make,
        model: formData.model,
        year: Number(formData.year),
        licensePlate: formData.licensePlate,
        odometer: Number(formData.odometer),
        status: formData.status,
      };
      if (formData.vin) payload.vin = formData.vin;
      if (formData.color) payload.color = formData.color;

      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const { vehicle: updated } = await res.json();
        setVehicle({ ...vehicle, ...updated });
        setEditing(false);
        setToast(`${updated.name || vehicle.name} saved`);
      } else {
        setErrorToast('Could not save changes. Please try again.');
      }
    } catch {
      setErrorToast('Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleFieldChange(field: keyof EditFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="space-y-4">
      {/* Success Toast */}
      {toast && (
        <div
          role="status"
          className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          <span>{toast}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
            className="ml-1 rounded p-0.5 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Error Toast */}
      {errorToast && (
        <div
          role="alert"
          className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-lg"
        >
          <span>{errorToast}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setErrorToast(null)}
            className="ml-1 rounded p-0.5 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <VehicleAvatar name={vehicle.name} photoUrl={vehicle.photoUrl} size="lg" />
          <div>
            <Link
              href="/vehicles"
              className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
            >
              &larr; Vehicles
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">{vehicle.name}</h1>
            <p className="text-sm text-slate-500">
              {vehicle.make} {vehicle.model} {vehicle.year}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-600">{vehicle.licensePlate}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrafficLight
            status={vehicle.trafficLight}
            size="lg"
            label={TRAFFIC_LIGHT_LABELS[vehicle.trafficLight]}
          />
          {!editing && (
            <button
              onClick={handleEdit}
              className="rounded-md bg-fleet-sidebar px-3 py-1.5 text-sm font-medium text-white hover:bg-fleet-sidebar/90"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Edit Vehicle</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-slate-700">Name</label>
              <input
                id="edit-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="edit-make" className="block text-sm font-medium text-slate-700">Make</label>
              <input
                id="edit-make"
                type="text"
                value={formData.make}
                onChange={(e) => handleFieldChange('make', e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {fieldErrors.make && <p className="mt-1 text-xs text-red-600">{fieldErrors.make}</p>}
            </div>
            <div>
              <label htmlFor="edit-model" className="block text-sm font-medium text-slate-700">Model</label>
              <input
                id="edit-model"
                type="text"
                value={formData.model}
                onChange={(e) => handleFieldChange('model', e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {fieldErrors.model && <p className="mt-1 text-xs text-red-600">{fieldErrors.model}</p>}
            </div>
            <div>
              <label htmlFor="edit-year" className="block text-sm font-medium text-slate-700">Year</label>
              <input
                id="edit-year"
                type="number"
                value={formData.year}
                onChange={(e) => handleFieldChange('year', e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {fieldErrors.year && <p className="mt-1 text-xs text-red-600">{fieldErrors.year}</p>}
            </div>
            <div>
              <label htmlFor="edit-license-plate" className="block text-sm font-medium text-slate-700">License Plate</label>
              <input
                id="edit-license-plate"
                type="text"
                value={formData.licensePlate}
                onChange={(e) => handleFieldChange('licensePlate', e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {fieldErrors.licensePlate && <p className="mt-1 text-xs text-red-600">{fieldErrors.licensePlate}</p>}
            </div>
            <div>
              <label htmlFor="edit-vin" className="block text-sm font-medium text-slate-700">VIN</label>
              <input
                id="edit-vin"
                type="text"
                value={formData.vin}
                onChange={(e) => handleFieldChange('vin', e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {fieldErrors.vin && <p className="mt-1 text-xs text-red-600">{fieldErrors.vin}</p>}
            </div>
            <div>
              <label htmlFor="edit-color" className="block text-sm font-medium text-slate-700">Color</label>
              <input
                id="edit-color"
                type="text"
                value={formData.color}
                onChange={(e) => handleFieldChange('color', e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="edit-odometer" className="block text-sm font-medium text-slate-700">Odometer (km)</label>
              <input
                id="edit-odometer"
                type="number"
                value={formData.odometer}
                onChange={(e) => handleFieldChange('odometer', e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {fieldErrors.odometer && <p className="mt-1 text-xs text-red-600">{fieldErrors.odometer}</p>}
            </div>
            <div>
              <label htmlFor="edit-status" className="block text-sm font-medium text-slate-700">Status</label>
              <select
                id="edit-status"
                value={formData.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-fleet-sidebar px-4 py-2 text-sm font-medium text-white hover:bg-fleet-sidebar/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Vehicle detail tabs"
        className="flex border-b border-slate-200"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-fleet-sidebar text-fleet-sidebar'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panel */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'overview' && <OverviewTab vehicle={vehicle} />}
        {activeTab === 'trips' && <TripsTab vehicleId={vehicle.id} />}
        {activeTab === 'maintenance' && <MaintenanceTab vehicleId={vehicle.id} currentOdometer={vehicle.odometer} />}
        {activeTab === 'inspections' && <InspectionsTab vehicleId={vehicle.id} vehicleType={null} />}
        {activeTab === 'documents' && <PlaceholderTab title="Documents" description="Vehicle documents (registration, insurance, certificates) will appear here." />}
      </div>
    </div>
  );
}

function vehicleToFormData(vehicle: VehicleDetailData): EditFormData {
  return {
    name: vehicle.name,
    make: vehicle.make,
    model: vehicle.model,
    year: String(vehicle.year),
    vin: vehicle.vin || '',
    licensePlate: vehicle.licensePlate,
    color: vehicle.color || '',
    odometer: String(vehicle.odometer),
    status: vehicle.status,
  };
}

function OverviewTab({ vehicle }: { vehicle: VehicleDetailData }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Vehicle info card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Vehicle Info</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Status</dt>
            <dd className="font-medium text-slate-900">{formatStatus(vehicle.status)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Odometer</dt>
            <dd className="font-medium text-slate-900">{vehicle.odometer.toLocaleString('en-US')} km</dd>
          </div>
          {vehicle.vin && (
            <div className="flex justify-between">
              <dt className="text-slate-500">VIN</dt>
              <dd className="font-mono text-xs font-medium text-slate-900">{vehicle.vin}</dd>
            </div>
          )}
          {vehicle.color && (
            <div className="flex justify-between">
              <dt className="text-slate-500">Color</dt>
              <dd className="font-medium text-slate-900">{vehicle.color}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-slate-500">Motion</dt>
            <dd className="font-medium text-slate-900">{formatMotionState(vehicle.motionState)}</dd>
          </div>
        </dl>
      </div>

      {/* Mini-map card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Current Location</h2>
        {vehicle.latestPosition ? (
          <div className="h-64 overflow-hidden rounded-md">
            <VehicleMiniMap
              latitude={vehicle.latestPosition.latitude}
              longitude={vehicle.latestPosition.longitude}
              vehicleName={vehicle.name}
              trafficLight={vehicle.trafficLight}
            />
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-md bg-slate-50 text-sm text-slate-400">
            No position data available
          </div>
        )}
      </div>
    </div>
  );
}

function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-16 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function formatStatus(status: string): string {
  const label = STATUS_OPTIONS.find(o => o.value === status);
  return label ? label.label : status;
}

function formatMotionState(state: string): string {
  switch (state) {
    case 'MOVING': return 'Moving';
    case 'IDLE': return 'Idle';
    case 'PARKED': return 'Parked';
    default: return state;
  }
}
