import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { VehicleAvatar } from './vehicle-avatar';

// Mock next/image to render a simple img
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

describe('VehicleAvatar', () => {
  afterEach(() => {
    cleanup();
  });

  // AC-1: Vehicle photo rendered in detail header (or initial-letter placeholder if no photo)
  it('renders photo when photoUrl is provided', () => {
    render(<VehicleAvatar name="Van Alpha" photoUrl="/uploads/van-alpha.jpg" size="lg" />);
    const img = screen.getByRole('img', { name: /photo of van alpha/i });
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('/uploads/van-alpha.jpg');
  });

  it('renders initial-letter placeholder when no photo', () => {
    render(<VehicleAvatar name="Van Alpha" photoUrl={null} size="lg" />);
    expect(screen.getByText('V')).toBeDefined();
    expect(screen.getByLabelText(/van alpha avatar/i)).toBeDefined();
  });

  // AC-2: Vehicle thumbnail shown in each list row (photo or placeholder)
  it('renders small size for list rows', () => {
    const { container } = render(<VehicleAvatar name="Truck 01" photoUrl={null} size="sm" />);
    const avatar = container.querySelector('.h-8.w-8');
    expect(avatar).toBeDefined();
    expect(avatar?.textContent).toBe('T');
  });

  it('renders medium size by default', () => {
    const { container } = render(<VehicleAvatar name="Truck 01" photoUrl={null} />);
    const avatar = container.querySelector('.h-10.w-10');
    expect(avatar).toBeDefined();
  });

  it('renders photo at sm size', () => {
    render(<VehicleAvatar name="Van 02" photoUrl="/uploads/van-02.jpg" size="sm" />);
    const img = screen.getByRole('img', { name: /photo of van 02/i });
    expect(img.getAttribute('width')).toBe('32');
    expect(img.getAttribute('height')).toBe('32');
  });
});
