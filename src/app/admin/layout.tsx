import React from 'react';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/admin/Sidebar';
import { ToastProvider } from '@/components/admin/Toast';
import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/supabase/auth';
import { Bell } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side authentication check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login?redirect=/admin');
  }

  // Check if user has admin or mentor role
  const profile = await getUserProfile(supabase, user.id);
  const hasAccess = profile?.role === 'admin' || profile?.role === 'mentor';

  // Redirect to unauthorized page if not admin or mentor
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar userRole={profile?.role} />
        <div className="flex flex-1 flex-col overflow-hidden lg:ml-64">
          {/* Header */}
          <header className="border-b bg-background">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold text-foreground">
                  Data Portal
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <button className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                  <Bell className="h-6 w-6" />
                </button>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto bg-muted/10">
            <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
