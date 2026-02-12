import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{
    eventKey: string;
  }>;
}

/**
 * Event-scoped picklist page
 * Redirects to the main picklist page with the event pre-selected via query param
 */
export default async function EventPicklistPage({ params }: PageProps) {
  const { eventKey } = await params;

  // Redirect to the main picklist with event pre-selected
  redirect(`/admin/picklist?event=${eventKey}`);
}
