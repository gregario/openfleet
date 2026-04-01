import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-16 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-4 rounded-md bg-fleet-sidebar px-4 py-2 text-sm font-medium text-white hover:bg-fleet-sidebar-hover"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
