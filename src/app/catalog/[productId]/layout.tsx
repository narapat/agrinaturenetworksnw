import type { Metadata } from 'next';
import { getProductByIdServer } from '@/lib/serverData';

export async function generateMetadata({
  params,
}: {
  params: { productId: string };
}): Promise<Metadata> {
  const productId = params.productId;
  const product = await getProductByIdServer(productId);

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
      description: `มาชมของดี "${title}" จากแปลง "${farmName}" ${district} จ.นครสวรรค์`,
      images: [defaultPhoto],
    },
  };
}

export default function ProductDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
