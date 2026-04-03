type Status = 'GREEN' | 'ORANGE' | 'RED';
type Size = 'sm' | 'md' | 'lg';

interface TrafficLightProps {
  status: Status;
  size?: Size;
  label?: string;
}

const colorMap: Record<Status, string> = {
  GREEN: 'bg-fleet-green',
  ORANGE: 'bg-fleet-orange',
  RED: 'bg-fleet-red',
};

const sizeMap: Record<Size, string> = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

const statusLabels: Record<Status, string> = {
  GREEN: 'All clear',
  ORANGE: 'Requires attention',
  RED: 'Overdue',
};

export function TrafficLight({ status, size = 'md', label }: TrafficLightProps) {
  const ariaLabel = statusLabels[status];

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      title={ariaLabel}
      className="inline-flex items-center gap-1.5"
    >
      <span className={`inline-block rounded-full ${colorMap[status]} ${sizeMap[size]}`} />
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </span>
  );
}
