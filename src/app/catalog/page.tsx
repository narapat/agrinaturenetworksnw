import { getPublicProductsServer, getGroupedSKUsServer } from '@/lib/serverData';
import CatalogClientView from './CatalogClientView';

// Next.js ISR — Edge Cache for 3 minutes (180s)
export const revalidate = 180;

export default async function CatalogPage() {
  const [products, skuGroups] = await Promise.all([
    getPublicProductsServer(),
    getGroupedSKUsServer(),
  ]);

  return (
    <CatalogClientView
      initialProducts={products}
      initialSkuGroups={skuGroups}
    />
  );
}
