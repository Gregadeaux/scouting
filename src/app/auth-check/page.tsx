import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AuthCheckPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Not Logged In</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">You are not currently logged in.</p>
          <a href="/auth/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Authentication Status</h1>

        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">User Info:</h2>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded space-y-2 text-gray-900 dark:text-gray-100">
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email}</p>
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Profile Info:</h2>
            {profile ? (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded space-y-2 text-gray-900 dark:text-gray-100">
                <p><strong>Role:</strong> <span className={profile.role === 'admin' ? 'text-green-600 dark:text-green-400 font-bold' : 'text-orange-600 dark:text-orange-400'}>{profile.role}</span></p>
                <p><strong>Full Name:</strong> {profile.full_name || 'Not set'}</p>
                <p><strong>Display Name:</strong> {profile.display_name || 'Not set'}</p>
                <p><strong>Active:</strong> {profile.is_active ? 'Yes' : 'No'}</p>
                <p><strong>Email Verified:</strong> {profile.email_verified ? 'Yes' : 'No'}</p>
              </div>
            ) : (
              <p className="text-red-600 dark:text-red-400">No profile found!</p>
            )}
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Access Check:</h2>
            <div className="space-y-2">
              {profile?.role === 'admin' ? (
                <p className="text-green-600 dark:text-green-400">✓ You SHOULD be able to access /admin routes</p>
              ) : (
                <p className="text-red-600 dark:text-red-400">✗ You should NOT be able to access /admin routes</p>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <a href="/admin" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Try Admin Dashboard
            </a>
            <a href="/dashboard" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              User Dashboard
            </a>
            <Link href="/" className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-600">
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
