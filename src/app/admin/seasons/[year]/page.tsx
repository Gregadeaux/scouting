import { notFound } from 'next/navigation';
import { SeasonDetailClient } from './SeasonDetailClient';

interface SeasonDetailPageProps {
  params: Promise<{
    year: string;
  }>;
}

export default async function SeasonDetailPage({ params }: SeasonDetailPageProps) {
  const { year: yearParam } = await params;
  const year = parseInt(yearParam);

  // Validate year
  if (isNaN(year) || year < 1992 || year > 2100) {
    notFound();
  }

  // Pass the year to the client component which will handle the API call
  // This keeps the page simple and allows for client-side error handling
  return <SeasonDetailClient year={year} />;
}
