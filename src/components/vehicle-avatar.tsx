import Image from 'next/image';

type AvatarSize = 'sm' | 'md' | 'lg';

interface VehicleAvatarProps {
  name: string;
  photoUrl: string | null;
  size?: AvatarSize;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
};

const imageSizes: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 64,
};

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function VehicleAvatar({ name, photoUrl, size = 'md' }: VehicleAvatarProps) {
  const classes = sizeClasses[size];
  const px = imageSizes[size];

  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={`Photo of ${name}`}
        width={px}
        height={px}
        className={`${classes} rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      aria-label={`${name} avatar`}
      className={`${classes} inline-flex items-center justify-center rounded-full bg-fleet-sidebar font-semibold text-white`}
    >
      {getInitial(name)}
    </span>
  );
}
