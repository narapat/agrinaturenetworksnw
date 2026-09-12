import { getNewsServer } from '@/lib/serverData';
import NewsClientView from './NewsClientView';

// Next.js ISR — Edge Cache for 3 minutes (180s)
export const revalidate = 180;

export default async function NewsPage() {
  const newsList = await getNewsServer();

  return (
    <NewsClientView initialNews={newsList} />
  );
}
