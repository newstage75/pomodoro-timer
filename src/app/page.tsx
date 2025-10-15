import PomodoroTimer from "@/components/PomodoroTimer";

export default function Home() {
  return (
    <main className="min-h-screen p-2 sm:p-4 md:p-8 bg-gray-100 flex items-start justify-center pt-8 sm:pt-12 md:pt-20">
      <div className="w-full max-w-6xl">
        <PomodoroTimer />
      </div>
    </main>
  );
}
