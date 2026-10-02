import './globals.css';
import React from 'react';

export const metadata = {
  title: 'A2A Agent Platform Dashboard',
  description: 'Discover and delegate tasks between autonomous AI agents using A2A protocol',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
