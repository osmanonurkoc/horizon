import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Personal Horizon | Your Desktop Dashboard',
  description: 'A strictly desktop-only, personalized daily briefing dashboard.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground selection:bg-primary/30">
        <div className="hidden min-[1024px]:block">
          {children}
        </div>
        <div className="flex min-[1024px]:hidden min-h-screen items-center justify-center p-10 text-center bg-background">
          <div className="max-w-md space-y-4">
            <h1 className="text-3xl font-headline font-bold">Desktop Only Required</h1>
            <p className="text-muted-foreground">Personal Horizon is designed for large displays. Please view this dashboard on a device with at least 1024px width.</p>
          </div>
        </div>
      </body>
    </html>
  );
}