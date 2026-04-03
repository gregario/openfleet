'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { TrafficLight } from './traffic-light';

export interface VehicleListItem {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  status: string;
  odometer: number;
  trafficLight: 'GREEN' | 'ORANGE' | 'RED';
}

type SortField = 'name' | 'trafficLight' | 'odometer';
type SortDirection = 'ascending' | 'descending';

const TRAFFIC_LIGHT_PRIORITY: Record<string, number> = {
  RED: 0,
  ORANGE: 1,
  GREEN: 2,
};

function matchesSearch(vehicle: VehicleListItem, query: string): boolean {
  const q = query.toLowerCase();
  return (
    vehicle.name.toLowerCase().includes(q) ||
    vehicle.licensePlate.toLowerCase().includes(q) ||
    vehicle.make.toLowerCase().includes(q) ||
    vehicle.model.toLowerCase().includes(q)
  );
}

interface VehicleListProps {
  vehicles: VehicleListItem[];
}

export function VehicleList({ vehicles }: VehicleListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ascending');
  const [showDecommissioned, setShowDecommissioned] = useState(false);

  const hasDecommissioned = useMemo(() => vehicles.some(v => v.status === 'DECOMMISSIONED'), [vehicles]);

  const filteredAndSorted = useMemo(() => {
    let result = vehicles;

    // Hide decommissioned by default
    if (!showDecommissioned) {
      result = result.filter(v => v.status !== 'DECOMMISSIONED');
    }

    // Filter by search
    if (search) {
      result = result.filter(v => matchesSearch(v, search));
    }

    // Filter by status
    if (statusFilter) {
      result = result.filter(v => v.trafficLight === statusFilter);
    }

    // Sort
    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'trafficLight':
          cmp = TRAFFIC_LIGHT_PRIORITY[a.trafficLight] - TRAFFIC_LIGHT_PRIORITY[b.trafficLight];
          break;
        case 'odometer':
          cmp = a.odometer - b.odometer;
          break;
      }
      return sortDirection === 'ascending' ? cmp : -cmp;
    });

    return sorted;
  }, [vehicles, search, statusFilter, sortField, sortDirection, showDecommissioned]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(d => (d === 'ascending' ? 'descending' : 'ascending'));
    } else {
      setSortField(field);
      setSortDirection('ascending');
    }
  }

  function getSortAriaSort(field: SortField): 'ascending' | 'descending' | 'none' {
    return sortField === field ? sortDirection : 'none';
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-16 text-center">
        <h3 className="text-lg font-semibold text-slate-900">No vehicles</h3>
        <p className="mt-1 text-sm text-slate-500">Add your first vehicle to get started.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search and filter controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search vehicles..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-fleet-sidebar focus:outline-none focus:ring-1 focus:ring-fleet-sidebar sm:w-64"
        />
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-fleet-sidebar focus:outline-none focus:ring-1 focus:ring-fleet-sidebar"
        >
          <option value="">All statuses</option>
          <option value="GREEN">All clear</option>
          <option value="ORANGE">Requires attention</option>
          <option value="RED">Overdue</option>
        </select>
        {hasDecommissioned && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showDecommissioned}
              onChange={e => setShowDecommissioned(e.target.checked)}
              className="rounded border-slate-300 text-fleet-sidebar focus:ring-fleet-sidebar"
            />
            Show decommissioned
          </label>
        )}
      </div>

      {/* No results */}
      {filteredAndSorted.length === 0 && (
        <div className="rounded-lg border border-slate-200 py-12 text-center">
          <p className="text-sm text-slate-500">No vehicles match your search or filter.</p>
        </div>
      )}

      {/* Table */}
      {filteredAndSorted.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table role="table" className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th
                  role="columnheader"
                  tabIndex={0}
                  aria-sort={getSortAriaSort('name')}
                  onClick={() => handleSort('name')}
                  onKeyDown={e => e.key === 'Enter' && handleSort('name')}
                  className="cursor-pointer select-none px-4 py-3 font-medium text-slate-700 hover:bg-slate-100"
                >
                  Vehicle {sortField === 'name' && (sortDirection === 'ascending' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 font-medium text-slate-700">Plate</th>
                <th
                  role="columnheader"
                  tabIndex={0}
                  aria-sort={getSortAriaSort('trafficLight')}
                  onClick={() => handleSort('trafficLight')}
                  onKeyDown={e => e.key === 'Enter' && handleSort('trafficLight')}
                  className="cursor-pointer select-none px-4 py-3 font-medium text-slate-700 hover:bg-slate-100"
                >
                  Status {sortField === 'trafficLight' && (sortDirection === 'ascending' ? '↑' : '↓')}
                </th>
                <th
                  role="columnheader"
                  tabIndex={0}
                  aria-sort={getSortAriaSort('odometer')}
                  onClick={() => handleSort('odometer')}
                  onKeyDown={e => e.key === 'Enter' && handleSort('odometer')}
                  className="cursor-pointer select-none px-4 py-3 font-medium text-slate-700 hover:bg-slate-100"
                >
                  Mileage {sortField === 'odometer' && (sortDirection === 'ascending' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSorted.map(vehicle => (
                <tr key={vehicle.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/vehicles/${vehicle.id}`}
                      className="font-medium text-slate-900 hover:text-fleet-sidebar"
                    >
                      {vehicle.name}
                    </Link>
                    <div className="text-xs text-slate-500">{vehicle.make} {vehicle.model}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{vehicle.licensePlate}</td>
                  <td className="px-4 py-3">
                    <TrafficLight status={vehicle.trafficLight} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-slate-600 tabular-nums">
                    {vehicle.odometer.toLocaleString('en-US')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
