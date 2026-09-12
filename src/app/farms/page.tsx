import { getPublicFarmsServer, getPublicProductsServer } from '@/lib/serverData';
import FarmsClientView from './FarmsClientView';

// Next.js ISR — Edge Cache for 3 minutes (180s)
export const revalidate = 180;

export default async function FarmsPage() {
  const [farms, products] = await Promise.all([
    getPublicFarmsServer(),
    getPublicProductsServer(),
  ]);

  // คำนวณจำนวนสินค้าของแต่ละแปลงล่วงหน้าบน Server
  const farmProductCounts: Record<string, number> = {};
  for (const prod of products) {
    if (prod.farmId) {
      farmProductCounts[prod.farmId] = (farmProductCounts[prod.farmId] || 0) + 1;
    }
  }

  return (
    <FarmsClientView
      initialFarms={farms}
      farmProductCounts={farmProductCounts}
    />
  );
}
