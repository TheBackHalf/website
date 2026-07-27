export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-purple-600">
          The Back Half
        </p>

        <h1 className="max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
          Magical is Possible.
        </h1>

        <p className="mt-8 max-w-2xl text-xl leading-8 text-gray-600">
          The Back Half helps people transition from living by expectation to
          living with intention.
        </p>

        <button className="mt-10 rounded-full bg-purple-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-purple-700">
          Begin Your Journey
        </button>
      </section>
    </main>
  );
}