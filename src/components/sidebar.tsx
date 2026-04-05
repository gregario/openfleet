import Link from 'next/link';
import { LogoutButton } from './logout-button';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '⊞' },
  { label: 'Vehicles', href: '/vehicles', icon: '⊟' },
  { label: 'Drivers', href: '/drivers', icon: '⊠' },
  { label: 'Maintenance', href: '/maintenance', icon: '⊡' },
  { label: 'Inspections', href: '/inspections', icon: '⊘' },
  { label: 'Settings', href: '/settings', icon: '⊙' },
];

interface SidebarProps {
  activePath: string;
}

export function Sidebar({ activePath }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col bg-fleet-sidebar text-white">
      <div className="flex h-16 items-center px-6">
        <span className="text-xl font-bold tracking-tight">OpenFleet</span>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive =
            activePath === item.href ||
            (item.href !== '/dashboard' && activePath.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-fleet-sidebar-active text-white'
                  : 'text-slate-300 hover:bg-fleet-sidebar-hover hover:text-white'
              }`}
            >
              <NavIcon label={item.label} active={isActive} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-700 p-3 space-y-2">
        <LogoutButton />
        <p className="px-3 text-xs text-slate-400">OpenFleet v0.1</p>
      </div>
    </aside>
  );
}

function NavIcon({ label, active }: { label: string; active: boolean }) {
  const cls = `h-5 w-5 ${active ? 'text-white' : 'text-slate-400'}`;

  switch (label) {
    case 'Dashboard':
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7A1 1 0 003 11h1v6a1 1 0 001 1h4v-5h2v5h4a1 1 0 001-1v-6h1a1 1 0 00.707-1.707l-7-7z" />
        </svg>
      );
    case 'Vehicles':
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
          <path d="M4 16a2 2 0 110-4 2 2 0 010 4zm12 0a2 2 0 110-4 2 2 0 010 4zM3 6l1.5-3h11L17 6H3zm-1 2h16v4H2V8z" />
        </svg>
      );
    case 'Drivers':
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 1114 0H3z" />
        </svg>
      );
    case 'Maintenance':
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      );
    case 'Inspections':
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm5.707 5.707a1 1 0 00-1.414-1.414L7 10.586l-.293-.293a1 1 0 00-1.414 1.414l1 1a1 1 0 001.414 0l2-2z" />
        </svg>
      );
    case 'Settings':
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      );
    default:
      return <span className={cls}>●</span>;
  }
}
