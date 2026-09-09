import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FontSizeProvider } from '@/context/FontSizeContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'เครือข่ายกสิกรรมธรรมชาติ จังหวัดนครสวรรค์ | Agri-Nature Network Nakhon Sawan',
  description: 'ศูนย์รวมผลผลิตและของดีกสิกรรมธรรมชาติ จ.นครสวรรค์ ถ่านไบโอชาร์ น้ำส้มควันไม้ ปุ๋ยหมักโบกาฉิ ผลผลิตอินทรีย์ และเมล็ดพันธุ์แบ่งปัน',
  openGraph: {
    title: 'เครือข่ายกสิกรรมธรรมชาติ จังหวัดนครสวรรค์',
    description: 'สดจากแปลง แลกเปลี่ยน แบ่งปัน เชื่อมโยง 15 อำเภอในนครสวรรค์',
    type: 'website',
  },
  icons: {
    icon: '/images/logo.jpg',
    apple: '/images/logo.jpg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="overflow-x-hidden max-w-full">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var size = localStorage.getItem('nsw_agri_font_size');
                  if (!size) {
                    var m = document.cookie.match(/nsw_agri_font_size=([^;]+)/);
                    if (m) size = m[1];
                  }
                  if (size === 'xlarge') {
                    document.documentElement.setAttribute('data-font-size', 'xlarge');
                    document.documentElement.style.fontSize = '21.5px';
                  } else if (size === 'large') {
                    document.documentElement.setAttribute('data-font-size', 'large');
                    document.documentElement.style.fontSize = '18.5px';
                  } else {
                    document.documentElement.setAttribute('data-font-size', 'normal');
                    document.documentElement.style.fontSize = '16px';
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[#fcfcf9] text-stone-900 pb-20 md:pb-0 selection:bg-brand-100 selection:text-brand-900">
        <FontSizeProvider>
          <Header />
          <main className="flex-1 w-full max-w-full overflow-x-hidden">
            {children}
          </main>
          <BottomNav />
          <Analytics />
        </FontSizeProvider>
      </body>
    </html>
  );
}
