import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

export const metadata: Metadata = { title: '404 | sitebots' };

// An address no route answers gets a real 404 status from here. It sits outside the [lang] root layout,
// so it cannot know the visitor's language and says it in both. (A catch-all page inside [lang] would
// render under loading.tsx, stream a 200 first and turn every unknown address into a soft 404.)
export default function GlobalNotFound() {
  return (
    <html lang="en" data-theme="dark" className={`${geist.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <main className="mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-6">
          <p className="label">404</p>
          <h1 className="mt-2 text-2xl font-semibold">No such page</h1>
          <p className="mt-3 text-muted"><a href="/" className="underline underline-offset-4">Back to the robots</a></p>
          <h2 lang="de" className="mt-10 text-2xl font-semibold">Diese Seite gibt es nicht</h2>
          <p lang="de" className="mt-3 text-muted"><a href="/de" className="underline underline-offset-4">Zurück zu den Robotern</a></p>
        </main>
      </body>
    </html>
  );
}
