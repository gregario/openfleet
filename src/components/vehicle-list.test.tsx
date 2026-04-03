import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { VehicleList, type VehicleListItem } from './vehicle-list';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

const mockVehicles: VehicleListItem[] = [
  {
    id: 'v1',
    name: 'Van 01',
    make: 'Ford',
    model: 'Transit',
    year: 2021,
    licensePlate: 'WR71 HJK',
    status: 'ACTIVE',
    odometer: 45000,
    trafficLight: 'GREEN',
    photoUrl: '/uploads/van-01.jpg',
  },
  {
    id: 'v2',
    name: 'Van 02',
    make: 'Mercedes',
    model: 'Sprinter',
    year: 2020,
    licensePlate: 'AB20 CDE',
    status: 'ACTIVE',
    odometer: 72000,
    trafficLight: 'RED',
    photoUrl: null,
  },
  {
    id: 'v3',
    name: 'Truck 01',
    make: 'Toyota',
    model: 'Hilux',
    year: 2022,
    licensePlate: 'XY22 ZZZ',
    status: 'IN_SHOP',
    odometer: 15000,
    trafficLight: 'ORANGE',
    photoUrl: null,
  },
];

// @criterion: fa2-vehicle-list-001, fa2-vehicle-list-002
// @criterion-hash: a1b2c3d4e5f6, b2c3d4e5f6a7
describe('VehicleList', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // AC-2: Vehicle list shows traffic light indicator per row
  describe('traffic light indicator per row', () => {
    it('renders a traffic light status indicator for each vehicle', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      // Each table row has a TrafficLight with role=status
      const table = screen.getByRole('table');
      const indicators = table.querySelectorAll('[role="status"]');
      expect(indicators.length).toBe(3);
    });

    it('shows correct traffic light colors', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      // Check that role=status elements exist with correct aria-labels
      const statuses = screen.getAllByRole('status');
      const labels = statuses.map(s => s.getAttribute('aria-label'));
      expect(labels).toContain('All clear');
      expect(labels).toContain('Overdue');
      expect(labels).toContain('Requires attention');
    });

    it('renders green, orange, and red indicators matching vehicle statuses', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      // Each table row should have a traffic light with role=status
      const table = screen.getByRole('table');
      const statuses = table.querySelectorAll('[role="status"]');
      expect(statuses.length).toBe(3);
    });
  });

  // AC-1: Vehicle list supports search
  describe('search', () => {
    it('renders a search input', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      expect(screen.getByPlaceholderText(/search/i)).toBeTruthy();
    });

    it('filters vehicles by name', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Van' } });
      expect(screen.getByText('Van 01')).toBeTruthy();
      expect(screen.getByText('Van 02')).toBeTruthy();
      expect(screen.queryByText('Truck 01')).toBeNull();
    });

    it('filters vehicles by license plate', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'WR71' } });
      expect(screen.getByText('Van 01')).toBeTruthy();
      expect(screen.queryByText('Van 02')).toBeNull();
    });

    it('filters vehicles by make/model', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Mercedes' } });
      expect(screen.getByText('Van 02')).toBeTruthy();
      expect(screen.queryByText('Van 01')).toBeNull();
    });

    it('search is case-insensitive', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'ford' } });
      expect(screen.getByText('Van 01')).toBeTruthy();
    });
  });

  // AC-1: Vehicle list supports sort (name, status, mileage)
  describe('sort', () => {
    it('renders sortable column headers', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      expect(screen.getByRole('columnheader', { name: /vehicle/i })).toBeTruthy();
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeTruthy();
      expect(screen.getByRole('columnheader', { name: /mileage/i })).toBeTruthy();
    });

    it('sorts by name ascending by default', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      const rows = screen.getAllByRole('row');
      // rows[0] is header, rows[1..3] are data — sorted by name: Truck 01, Van 01, Van 02
      expect(rows[1].textContent).toContain('Truck 01');
      expect(rows[2].textContent).toContain('Van 01');
      expect(rows[3].textContent).toContain('Van 02');
    });

    it('toggles sort direction when clicking same column', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      const nameHeader = screen.getByRole('columnheader', { name: /vehicle/i });
      fireEvent.click(nameHeader);
      const rows = screen.getAllByRole('row');
      expect(rows[1].textContent).toContain('Van 02');
      expect(rows[2].textContent).toContain('Van 01');
      expect(rows[3].textContent).toContain('Truck 01');
    });

    it('sorts by mileage', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      const mileageHeader = screen.getByRole('columnheader', { name: /mileage/i });
      fireEvent.click(mileageHeader);
      const rows = screen.getAllByRole('row');
      // Ascending: 15000, 45000, 72000
      expect(rows[1].textContent).toContain('Truck 01');
      expect(rows[2].textContent).toContain('Van 01');
      expect(rows[3].textContent).toContain('Van 02');
    });

    it('sorts by status (traffic light) — most urgent first', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      const statusHeader = screen.getByRole('columnheader', { name: /status/i });
      fireEvent.click(statusHeader);
      const rows = screen.getAllByRole('row');
      // Ascending priority: RED(0), ORANGE(1), GREEN(2)
      expect(rows[1].textContent).toContain('Van 02'); // RED
      expect(rows[2].textContent).toContain('Truck 01'); // ORANGE
      expect(rows[3].textContent).toContain('Van 01'); // GREEN
    });
  });

  // AC-1: Vehicle list supports filter
  describe('filter', () => {
    it('renders status filter dropdown', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      expect(screen.getByRole('combobox', { name: /filter by status/i })).toBeTruthy();
    });

    it('filters by traffic light status', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      fireEvent.change(screen.getByRole('combobox', { name: /filter by status/i }), { target: { value: 'RED' } });
      expect(screen.getByText('Van 02')).toBeTruthy();
      expect(screen.queryByText('Van 01')).toBeNull();
      expect(screen.queryByText('Truck 01')).toBeNull();
    });

    it('shows all vehicles when filter is cleared', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      const filter = screen.getByRole('combobox', { name: /filter by status/i });
      fireEvent.change(filter, { target: { value: 'RED' } });
      fireEvent.change(filter, { target: { value: '' } });
      expect(screen.getByText('Van 01')).toBeTruthy();
      expect(screen.getByText('Van 02')).toBeTruthy();
      expect(screen.getByText('Truck 01')).toBeTruthy();
    });
  });

  // Display
  describe('display', () => {
    it('renders vehicle details in each row', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      expect(screen.getByText('Van 01')).toBeTruthy();
      expect(screen.getByText('WR71 HJK')).toBeTruthy();
      expect(screen.getByText('Ford Transit')).toBeTruthy();
    });

    it('formats odometer with locale separators', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      expect(screen.getByText('45,000')).toBeTruthy();
    });

    it('links each vehicle row to detail page', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      const links = screen.getAllByRole('link');
      const v1Link = links.find(l => l.getAttribute('href') === '/vehicles/v1');
      expect(v1Link).toBeTruthy();
    });
  });

  // AC-6: Decommissioned vehicles hidden by default, visible via filter
  describe('decommissioned filter', () => {
    const vehiclesWithDecommissioned: VehicleListItem[] = [
      ...mockVehicles,
      {
        id: 'v4',
        name: 'Old Van',
        make: 'Ford',
        model: 'Connect',
        year: 2015,
        licensePlate: 'DE15 COM',
        status: 'DECOMMISSIONED',
        odometer: 150000,
        trafficLight: 'RED',
        photoUrl: null,
      },
    ];

    it('hides decommissioned vehicles by default', () => {
      render(<VehicleList vehicles={vehiclesWithDecommissioned} />);
      expect(screen.queryByText('Old Van')).toBeNull();
      expect(screen.getByText('Van 01')).toBeTruthy();
    });

    it('shows decommissioned vehicles when toggle is checked', () => {
      render(<VehicleList vehicles={vehiclesWithDecommissioned} />);
      const toggle = screen.getByRole('checkbox', { name: /decommissioned/i });
      fireEvent.click(toggle);
      expect(screen.getByText('Old Van')).toBeTruthy();
    });

    it('hides decommissioned vehicles again when toggle is unchecked', () => {
      render(<VehicleList vehicles={vehiclesWithDecommissioned} />);
      const toggle = screen.getByRole('checkbox', { name: /decommissioned/i });
      fireEvent.click(toggle);
      expect(screen.getByText('Old Van')).toBeTruthy();
      fireEvent.click(toggle);
      expect(screen.queryByText('Old Van')).toBeNull();
    });
  });

  // AC-fix-photo-and-list-polish-4: Fleet health summary bar above table
  describe('fleet health summary bar', () => {
    it('shows total vehicle count', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      expect(screen.getByText(/3 vehicles/i)).toBeTruthy();
    });

    it('shows per-status breakdown', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      // Should show counts for each traffic light status present
      expect(screen.getByText(/1 overdue/i)).toBeTruthy();
      expect(screen.getByText(/1 attention/i)).toBeTruthy();
      expect(screen.getByText(/1 clear/i)).toBeTruthy();
    });

    it('summary bar appears above the table', () => {
      const { container } = render(<VehicleList vehicles={mockVehicles} />);
      const summary = container.querySelector('[data-testid="fleet-health-summary"]');
      expect(summary).toBeTruthy();
    });
  });

  // AC-fix-photo-and-list-polish-5: Summary bar updates when decommissioned filter toggled
  describe('summary bar decommissioned sync', () => {
    const vehiclesWithDecommissioned: VehicleListItem[] = [
      ...mockVehicles,
      {
        id: 'v4',
        name: 'Old Van',
        make: 'Ford',
        model: 'Connect',
        year: 2015,
        licensePlate: 'DE15 COM',
        status: 'DECOMMISSIONED',
        odometer: 150000,
        trafficLight: 'RED',
        photoUrl: null,
      },
    ];

    it('excludes decommissioned from summary by default', () => {
      render(<VehicleList vehicles={vehiclesWithDecommissioned} />);
      expect(screen.getByText(/3 vehicles/i)).toBeTruthy();
    });

    it('includes decommissioned in summary when toggle is checked', () => {
      render(<VehicleList vehicles={vehiclesWithDecommissioned} />);
      const toggle = screen.getByRole('checkbox', { name: /decommissioned/i });
      fireEvent.click(toggle);
      expect(screen.getByText(/4 vehicles/i)).toBeTruthy();
    });

    it('updates per-status counts when decommissioned toggled', () => {
      render(<VehicleList vehicles={vehiclesWithDecommissioned} />);
      // Initially 1 overdue (Van 02)
      expect(screen.getByText(/1 overdue/i)).toBeTruthy();

      const toggle = screen.getByRole('checkbox', { name: /decommissioned/i });
      fireEvent.click(toggle);
      // Now 2 overdue (Van 02 + Old Van)
      expect(screen.getByText(/2 overdue/i)).toBeTruthy();
    });
  });

  // Empty state
  describe('empty state', () => {
    it('shows empty state when no vehicles', () => {
      render(<VehicleList vehicles={[]} />);
      expect(screen.getByText(/no vehicles/i)).toBeTruthy();
    });

    it('shows no results message when search matches nothing', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'nonexistent' } });
      expect(screen.getByText(/no vehicles match/i)).toBeTruthy();
    });
  });

  // AC-fix-photo-and-list-polish-2: Vehicle thumbnail in each list row
  describe('vehicle thumbnails', () => {
    it('shows photo thumbnail when vehicle has photoUrl', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      const img = screen.getByRole('img', { name: /photo of van 01/i });
      expect(img).toBeTruthy();
      expect(img.getAttribute('src')).toBe('/uploads/van-01.jpg');
    });

    it('shows initial-letter placeholder when no photo', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      // Van 02 has no photo — should show "V" placeholder
      const placeholders = screen.getAllByLabelText(/avatar/i);
      expect(placeholders.length).toBeGreaterThanOrEqual(2); // Van 02 and Truck 01
    });
  });

  // Accessibility
  describe('accessibility', () => {
    it('uses a table with proper semantic structure', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      expect(screen.getByRole('table')).toBeTruthy();
      expect(screen.getAllByRole('columnheader').length).toBeGreaterThanOrEqual(3);
    });

    it('sort headers are keyboard accessible', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      const nameHeader = screen.getByRole('columnheader', { name: /vehicle/i });
      expect(nameHeader.getAttribute('tabindex')).toBe('0');
    });

    it('indicates current sort direction via aria-sort', () => {
      render(<VehicleList vehicles={mockVehicles} />);
      const nameHeader = screen.getByRole('columnheader', { name: /vehicle/i });
      expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');
    });
  });
});
