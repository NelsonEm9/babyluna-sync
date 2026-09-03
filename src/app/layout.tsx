import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "BabyLuna Sync",
  description: "A shared, realtime daily-care checklist for two parents.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${workSans.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased bg-bg text-text-primary">
        <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col bg-bg">
          {children}
        </div>
      </body>
    </html>
  );
}
