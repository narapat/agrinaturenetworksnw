import type { Metadata } from 'next';
import { getFarmByIdServer } from '@/lib/serverData';

export async function generateMetadata({
  params,
}: {
  params: { farmId: string };
}): Promise<Metadata> {
  const farmId = params.farmId;
  const farm = await getFarmByIdServer(farmId);

  const farmName = farm?.farmName || 'แปลงกสิกรรมธรรมชาติ';
  const district = farm?.district ? `อ.${farm.district}` : '';
  const subdistrict = farm?.subdistrict ? `ต.${farm.subdistrict}` : '';
  const locationText = [subdistrict, district, 'จ.นครสวรรค์'].filter(Boolean).join(' ');
  const description = farm?.tagline || farm?.story || `แปลงกสิกรรมธรรมชาติ ${farmName} ${locationText} เครือข่ายกสิกรรมธรรมชาตินครสวรรค์`;

  // ใช้ภาพเริ่มต้นของแปลง (ภาพแรกที่เป็น URL) สำหรับเป็น OG Image พรีวิวใน LINE/Facebook
  const defaultPhoto =
    farm?.photos?.find((p) => p && p.startsWith('http')) ||
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&h=630&fit=crop';

  const shareTitle = `🌱 มาชมของดีแปลง "${farmName}" (${locationText})`;

  return {
    title: `${farmName} | เครือข่ายกสิกรรมธรรมชาติ นครสวรรค์`,
    description: `มาชมของดีแปลง "${farmName}" (${locationText}): ${description}`,
    openGraph: {
      title: shareTitle,
      description: `มาชมของดีและวิถีกสิกรรมธรรมชาติแปลง "${farmName}" (${locationText}) กันครับ`,
      type: 'website',
      images: [
        {
          url: defaultPhoto,
          width: 1200,
          height: 630,
          alt: farmName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description: `มาชมของดีแปลง "${farmName}" (${locationText}) เครือข่ายกสิกรรมธรรมชาติ`,
      images: [defaultPhoto],
    },
  };
}

export default function FarmDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
