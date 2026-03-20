import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Google Sans ไม่ได้อยู่ใน next/font/google โดยตรง
// ใช้ Inter เป็น fallback สำหรับ Latin และโหลด Google Sans ผ่าน <link> ใน globals.css
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
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
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        {/* Google Sans font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Google+Sans+Display:wght@400;700&family=Noto+Sans+Thai:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
