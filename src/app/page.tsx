import PomodoroTimer from "@/components/PomodoroTimer";

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-100">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-8">
          ポモドーロタイマー
        </h1>
        <PomodoroTimer />
      </div>
    </main>
  );
}
