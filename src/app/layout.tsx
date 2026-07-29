import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'محاسبه مالیات افغانستان',
  description: 'وب اپ تصفیه مالیه مطابق قانون مالیات بر عایدات افغانستان',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" data-theme="emerald">
      <body>{children}</body>
    </html>
  );
}
