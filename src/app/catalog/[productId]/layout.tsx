import type { Metadata } from 'next';
import { db } from '@/services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { INITIAL_PRODUCTS } from '@/data/mockData';
import { Product } from '@/types';

export async function generateMetadata({
  params,
}: {
  params: { productId: string };
}): Promise<Metadata> {
  const productId = params.productId;
  let product: Product | null = null;

  try {
    if (db) {
      const snap = await getDoc(doc(db, 'products', productId));
      if (snap.exists()) {
        product = snap.data() as Product;
      }
    }
  } catch (err) {
    console.warn('Server getDoc product for OG failed:', err);
  }

  if (!product) {
    product = INITIAL_PRODUCTS.find((p) => p.id === productId) || null;
  }

  const title = product?.title || 'ของดีกสิกรรมธรรมชาติ';
  const farmName = product?.farmName || 'เครือข่ายกสิกรรมธรรมชาติ';
  const district = product?.district ? `อ.${product.district}` : '';
  const priceText = product?.price ? `${product.price} บาท/${product.unit}` : '';
  const description = product?.description || `ผลผลิตธรรมชาติ ${title} จากแปลง ${farmName} ${district} จ.นครสวรรค์`;

  // ใช้ภาพแรกของผลผลิตสำหรับเป็น OG Image
  const defaultPhoto =
    product?.images?.find((img) => img && img.startsWith('http')) ||
    'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=1200&h=630&fit=crop';

  const shareTitle = `🥦 มาชมของดี "${title}" จากแปลง "${farmName}"`;

  return {
    title: `${title} - ${farmName} | ตลาดกสิกรรมธรรมชาตินครสวรรค์`,
    description: `มาชมของดี "${title}" จากแปลง "${farmName}" ${priceText ? `(${priceText})` : ''}: ${description}`,
    openGraph: {
      title: shareTitle,
      description: `มาชมของดี "${title}" จากแปลง "${farmName}" ${district} จ.นครสวรรค์ กันครับ`,
      type: 'website',
      images: [
        {
          url: defaultPhoto,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description: `มาชมของดี "${title}" จากแปลง "${farmName}" จ.นครสวรรค์`,
      images: [defaultPhoto],
    },
  };
}

export default function CatalogDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
