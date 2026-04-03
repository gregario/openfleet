'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrafficLight } from './traffic-light';
import { VehicleMiniMap } from './vehicle-mini-map';

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

interface VehicleDetailProps {
  vehicle: VehicleDetailData;
}

export function VehicleDetail({ vehicle }: VehicleDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
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
        <div className="flex items-center gap-2">
          <TrafficLight
            status={vehicle.trafficLight}
            size="lg"
            label={TRAFFIC_LIGHT_LABELS[vehicle.trafficLight]}
          />
        </div>
      </div>

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
        {activeTab === 'trips' && <PlaceholderTab title="Trip history" description="Trip history will appear here once GPS data is available." />}
        {activeTab === 'maintenance' && <PlaceholderTab title="Maintenance records" description="Service history and upcoming maintenance will appear here." />}
        {activeTab === 'inspections' && <PlaceholderTab title="Inspections" description="Pre-trip and post-trip inspection records will appear here." />}
        {activeTab === 'documents' && <PlaceholderTab title="Documents" description="Vehicle documents (registration, insurance, certificates) will appear here." />}
      </div>
    </div>
  );
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
            <dd className="font-medium text-slate-900">{vehicle.status}</dd>
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

function formatMotionState(state: string): string {
  switch (state) {
    case 'MOVING': return 'Moving';
    case 'IDLE': return 'Idle';
    case 'PARKED': return 'Parked';
    default: return state;
  }
}
