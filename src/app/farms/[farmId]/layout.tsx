import type { Metadata } from 'next';
import { getFarmByIdServer, getPublicFarmsServer } from '@/lib/serverData';

export async function generateStaticParams() {
  try {
    const farms = await getPublicFarmsServer();
    return farms.map((f) => ({ farmId: f.id }));
  } catch {
    return [
      { farmId: 'farm-001' },
      { farmId: 'farm-002' },
      { farmId: 'farm-003' },
      { farmId: 'farm-1788900219588' },
    ];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { farmId: string };
}): Promise<Metadata> {
  const fallbackTitle = 'แปลงกสิกรรมธรรมชาติ | เครือข่ายกสิกรรมธรรมชาติ นครสวรรค์';
  const fallbackDesc = 'ศูนย์เรียนรู้และแปลงกสิกรรมธรรมชาติ จ.นครสวรรค์ ยึดหลักเศรษฐกิจพอเพียง';
  const fallbackImage = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&h=630&fit=crop';

  try {
    const rawId = params?.farmId;
    const farmId = rawId ? decodeURIComponent(rawId).replace(/"/g, '').trim() : '';
    const farm = farmId ? await getFarmByIdServer(farmId).catch(() => null) : null;

    const farmName = farm?.farmName || 'แปลงกสิกรรมธรรมชาติ';
    const district = farm?.district ? `อ.${farm.district}` : '';
    const subdistrict = farm?.subdistrict ? `ต.${farm.subdistrict}` : '';
    const locationText = [subdistrict, district, 'จ.นครสวรรค์'].filter(Boolean).join(' ');
    const description = farm?.tagline || farm?.story || `แปลงกสิกรรมธรรมชาติ ${farmName} ${locationText} เครือข่ายกสิกรรมธรรมชาตินครสวรรค์`;

    // ใช้ภาพเริ่มต้นของแปลง (ภาพแรกที่เป็น URL เริ่มต้นด้วย http) ป้องกัน Data URL ความยาวสูง
    const defaultPhoto =
      farm?.photos?.find((p) => typeof p === 'string' && p.startsWith('http')) || fallbackImage;

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
  } catch (err) {
    console.error('[FarmLayout] Error generating metadata:', err);
    return {
      title: fallbackTitle,
      description: fallbackDesc,
    };
  }
}

export default function FarmDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

