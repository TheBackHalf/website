export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-8">
      <div className="max-w-4xl text-center">

        <h1 className="text-7xl font-bold tracking-tight mb-8">
          The Back Half
        </h1>

        <p className="text-2xl text-gray-300 leading-relaxed mb-12">
          Live in your fullness by transitioning
          <br />
          from expectation
          <br />
          to intention.
        </p>

        <button
          className="
            bg-white
            text-black
            px-10
            py-5
            rounded-full
            text-xl
            font-semibold
            hover:scale-105
            transition
            duration-300
          "
        >
          Begin Your Journey
        </button>

      </div>
    </main>
  );
}