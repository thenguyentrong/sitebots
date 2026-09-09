import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-6">
      <p className="label">404</p>
      <h1 className="mt-2 text-2xl font-semibold">No such page</h1>
      <p className="mt-3 text-muted">
        <Link href="/" className="underline underline-offset-4">
          Back to the robots
        </Link>
      </p>
    </main>
  );
}
