import { Sidebar } from '@/app/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-[var(--sidebar-width)] flex-1">
        <div className="mx-auto max-w-[1280px] px-6 py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
