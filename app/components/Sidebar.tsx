'use client';

import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  {
    label: 'Quizzes',
    href: '/quizzes',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: 'Individual Responses',
    href: '/responses',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Global Analytics',
    href: '/analytics/global',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
      </svg>
    ),
  },
  {
    label: 'Quiz Analytics',
    href: '/analytics/quiz',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-[var(--sidebar-width)] flex-col bg-inverse">
      {/* Brand */}
      <div className="flex h-16 items-center px-6">
        <span className="text-lg font-semibold text-ink-inverse">AskNatural</span>
      </div>

      {/* Navigation */}
      <nav className="mt-2 flex-1 px-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <a
              key={item.href}
              href={item.href}
              className={`group mb-0.5 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'border-l-2 border-accent bg-white/[0.06] text-white'
                  : 'border-l-2 border-transparent text-ink-inverse/60 hover:bg-white/[0.04] hover:text-ink-inverse/90'
              }`}
            >
              <span className={isActive ? 'text-accent' : 'text-ink-inverse/50 group-hover:text-ink-inverse/70'}>
                {item.icon}
              </span>
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/[0.06] px-3 py-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-ink-inverse/50 transition-colors hover:bg-white/[0.04] hover:text-ink-inverse/90"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
