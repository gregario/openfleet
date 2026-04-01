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

export function TrafficLight({ status, size = 'md', label }: TrafficLightProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block rounded-full ${colorMap[status]} ${sizeMap[size]}`} />
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </span>
  );
}
