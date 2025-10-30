import { DashboardView } from '@/components/admin/DashboardView';
import { getDashboardService } from '@/lib/services';

export default async function AdminDashboard() {
  // Use the service layer instead of direct Supabase queries
  const dashboardService = getDashboardService();
  const stats = await dashboardService.getDashboardStats();

  return <DashboardView stats={stats} />;
}
