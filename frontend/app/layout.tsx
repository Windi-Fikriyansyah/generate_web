import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Modern Image Comparison",
  description: "High-performance image processing system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className={`${inter.className} h-full`}>
        {children}
        <Toaster
          position="top-right"
          reverseOrder={false}
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '16px',
              padding: '16px 24px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            },
            success: {
              style: {
                background: '#10b981', // emerald-500
                boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.2)',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444', // red-500
                boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.2)',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#ef4444',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
