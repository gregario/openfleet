import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { TrafficLight } from './traffic-light';

// @criterion: fa1-traffic-light-002
// @criterion-hash: 28d2034f3514
describe('TrafficLight component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders with GREEN status', () => {
    const { container } = render(<TrafficLight status="GREEN" />);
    expect(container.querySelector('.bg-fleet-green')).toBeTruthy();
  });

  it('renders with ORANGE status', () => {
    const { container } = render(<TrafficLight status="ORANGE" />);
    expect(container.querySelector('.bg-fleet-orange')).toBeTruthy();
  });

  it('renders with RED status', () => {
    const { container } = render(<TrafficLight status="RED" />);
    expect(container.querySelector('.bg-fleet-red')).toBeTruthy();
  });

  it('renders with label text', () => {
    render(<TrafficLight status="GREEN" label="All clear" />);
    expect(screen.getByText('All clear')).toBeTruthy();
  });

  it('renders different sizes', () => {
    const { container: sm } = render(<TrafficLight status="GREEN" size="sm" />);
    expect(sm.querySelector('.h-2.w-2')).toBeTruthy();
    cleanup();

    const { container: lg } = render(<TrafficLight status="GREEN" size="lg" />);
    expect(lg.querySelector('.h-4.w-4')).toBeTruthy();
  });

  // AC-fix-photo-and-list-polish-3: Accessible traffic light indicators
  describe('accessibility', () => {
    it('has role=status', () => {
      render(<TrafficLight status="GREEN" />);
      expect(screen.getByRole('status')).toBeTruthy();
    });

    it('has descriptive aria-label for GREEN', () => {
      render(<TrafficLight status="GREEN" />);
      const el = screen.getByRole('status');
      expect(el.getAttribute('aria-label')).toBe('All clear');
    });

    it('has descriptive aria-label for ORANGE', () => {
      render(<TrafficLight status="ORANGE" />);
      const el = screen.getByRole('status');
      expect(el.getAttribute('aria-label')).toBe('Requires attention');
    });

    it('has descriptive aria-label for RED', () => {
      render(<TrafficLight status="RED" />);
      const el = screen.getByRole('status');
      expect(el.getAttribute('aria-label')).toBe('Overdue');
    });

    it('shows tooltip on hover', () => {
      render(<TrafficLight status="RED" />);
      const el = screen.getByRole('status');
      expect(el.getAttribute('title')).toBe('Overdue');
    });
  });
});
