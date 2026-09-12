import type { Metadata } from 'next';
import { getProductByIdServer, getPublicProductsServer } from '@/lib/serverData';

export async function generateStaticParams() {
  try {
    const products = await getPublicProductsServer();
    return products.map((p) => ({ productId: p.id }));
  } catch {
    return [
      { productId: 'prod-001' },
      { productId: 'prod-002' },
      { productId: 'prod-003' },
    ];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { productId: string };
}): Promise<Metadata> {
  const fallbackTitle = 'ของดีกสิกรรมธรรมชาติ | ตลาดกสิกรรมธรรมชาตินครสวรรค์';
  const fallbackDesc = 'ตลาดผลผลิตและของดีกสิกรรมธรรมชาติ จ.นครสวรรค์ ผลผลิตอินทรีย์ ปลอดสารเคมี';
  const fallbackImage = 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=1200&h=630&fit=crop';

  try {
    const rawId = params?.productId;
    const productId = rawId ? decodeURIComponent(rawId).replace(/"/g, '').trim() : '';
    const product = productId ? await getProductByIdServer(productId).catch(() => null) : null;

    const title = product?.title || 'ของดีกสิกรรมธรรมชาติ';
    const farmName = product?.farmName || 'เครือข่ายกสิกรรมธรรมชาติ';
    const district = product?.district ? `อ.${product.district}` : '';
    const priceText = product?.price ? `${product.price} บาท/${product.unit}` : '';
    const description = product?.description || `ผลผลิตธรรมชาติ ${title} จากแปลง ${farmName} ${district} จ.นครสวรรค์`;

    // ใช้ภาพแรกของผลผลิต (ภาพแรกที่เป็น URL เริ่มต้นด้วย http)
    const defaultPhoto =
      product?.images?.find((img) => typeof img === 'string' && img.startsWith('http')) || fallbackImage;

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
  } catch (err) {
    console.error('[ProductLayout] Error generating metadata:', err);
    return {
      title: fallbackTitle,
      description: fallbackDesc,
    };
  }
}

export default function ProductDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

