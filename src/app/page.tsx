import { getPublicProductsServer, getGroupedSKUsServer } from '@/lib/serverData';
import HomeClientView from './HomeClientView';

// Next.js ISR (Incremental Static Regeneration) — Edge Cache for 3 minutes (180s)
export const revalidate = 180;

export default async function HomePage() {
  const [products, skuGroups] = await Promise.all([
    getPublicProductsServer(),
    getGroupedSKUsServer(),
  ]);

  return (
    <HomeClientView 
      initialProducts={products}
      initialSkuGroups={skuGroups}
    />
  );
}
