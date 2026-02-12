import React from 'react';
import { redirect } from 'next/navigation';
import { ToastProvider } from '@/components/admin/Toast';
import { AdminLayoutClient } from '@/components/admin/AdminLayoutClient';
import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/supabase/auth';

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
    redirect('/auth/login?redirect=/admin');
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
      <AdminLayoutClient userRole={profile?.role}>
        <div className="flex flex-1 flex-col overflow-hidden lg:ml-72">
          {/* Main content */}
          <main className="flex-1 overflow-y-auto bg-slate-950">
            <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </AdminLayoutClient>
    </ToastProvider>
  );
}
