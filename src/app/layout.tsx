import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

// Google Sans ไม่ได้อยู่ใน next/font/google โดยตรง
// ใช้ Inter เป็น fallback สำหรับ Latin และโหลด Google Sans ผ่าน <link> ใน globals.css
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Samo Schedule | สโมสรนักศึกษาคณะวิทยาศาสตร์",
  description: "ระบบบริหารจัดการโครงการและปฏิทินกิจกรรม สโมสรนักศึกษาคณะวิทยาศาสตร์ มหาวิทยาลัยสงขลานครินทร์",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${inter.variable} ${notoSansThai.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <head />
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
