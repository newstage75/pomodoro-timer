"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TimerSettings {
  workDuration: number;
  breakDuration: number;
}

interface CompletedWork {
  id: string;
  title: string;
  duration: number;
  startedAt: Date;
  completedAt: Date;
  reflection: string;
}

const PomodoroTimer = () => {
  const [settings, setSettings] = useState<TimerSettings>({
    workDuration: 25,
    breakDuration: 5,
  });
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTitle, setCurrentTitle] = useState("");
  const [completedWorks, setCompletedWorks] = useState<CompletedWork[]>([]);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [workStartTime, setWorkStartTime] = useState<Date | null>(null);
  const [hasCompletedThisSession, setHasCompletedThisSession] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setTimeLeft(
      isBreak ? settings.breakDuration * 60 : settings.workDuration * 60
    );
  }, [settings, isBreak]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && !hasCompletedThisSession) {
      // タイマーが0になって、まだ完了処理していない場合のみ
      console.log("Timer reached 0, calling handleTimerComplete");
      handleTimerComplete();
    }

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, timeLeft, hasCompletedThisSession]);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          audioRef.current!.onended = () => setIsPlaying(false);
        })
        .catch((error) => {
          console.error("通知音の再生に失敗しました:", error);
          setIsPlaying(false);
        });
    }
  };

  const stopSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleTimerComplete = async () => {
    // 既に完了処理済みならスキップ
    if (hasCompletedThisSession) {
      console.log("Already completed this session, skipping");
      return;
    }

    console.log("Completing timer session");
    setHasCompletedThisSession(true);
    setIsRunning(false);
    playNotificationSound();

    if (!isBreak) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("pomodoro_sessions").insert({
          user_id: user.id,
          duration: settings.workDuration,
          completed: true,
        });
      }

      // 完了した作業を追加
      const endTime = new Date();
      const startTime = workStartTime || new Date(endTime.getTime() - settings.workDuration * 60 * 1000);

      const newWork: CompletedWork = {
        id: Date.now().toString(),
        title: currentTitle || "タイトルなし",
        duration: settings.workDuration,
        startedAt: startTime,
        completedAt: endTime,
        reflection: "",
      };

      console.log("Adding new completed work:", newWork.title);
      setCompletedWorks((prev) => [newWork, ...prev]);
      setCurrentTitle("");
      setWorkStartTime(null);

      // 休憩モードに切り替えて自動開始
      setTimeout(() => {
        setIsBreak(true);
        setTimeLeft(settings.breakDuration * 60);
        setHasCompletedThisSession(false);
        setIsRunning(true); // 休憩タイマーを自動開始
      }, 100);
    } else {
      // 休憩終了後、作業モードに切り替え
      setIsBreak(false);
      setTimeLeft(settings.workDuration * 60);
      setHasCompletedThisSession(false);
    }
  };

  const toggleTimer = () => {
    if (!isRunning && !isBreak && !workStartTime) {
      // 作業開始時刻を記録
      setWorkStartTime(new Date());
      setHasCompletedThisSession(false);
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setHasCompletedThisSession(false);
    setTimeLeft(
      isBreak ? settings.breakDuration * 60 : settings.workDuration * 60
    );
  };

  const toggleMode = () => {
    setIsRunning(false);
    setHasCompletedThisSession(false);
    setIsBreak(!isBreak);
    setTimeLeft(
      !isBreak ? settings.breakDuration * 60 : settings.workDuration * 60
    );
  };

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: Math.max(1, Math.min(60, parseInt(value) || 1)),
    }));
  };

  const handleReflectionChange = (workId: string, reflection: string) => {
    setCompletedWorks((prev) =>
      prev.map((work) =>
        work.id === workId ? { ...work, reflection } : work
      )
    );
  };

  const handleTitleChange = (workId: string, title: string) => {
    setCompletedWorks((prev) =>
      prev.map((work) =>
        work.id === workId ? { ...work, title } : work
      )
    );
  };

  const copyWorkMessage = async (work: CompletedWork) => {
    const startTimeStr = work.startedAt.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endTimeStr = work.completedAt.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let message = `作業「${work.title}」を完了しました。（${work.duration}分）\n${startTimeStr}〜${endTimeStr}`;

    if (work.reflection.trim()) {
      message += `\n\n感想:\n${work.reflection}`;
    }

    try {
      await navigator.clipboard.writeText(message);
      // 一時的に通知を表示するため、編集中のIDを設定
      setEditingWorkId(work.id);
      setTimeout(() => {
        if (editingWorkId === work.id) {
          setEditingWorkId(null);
        }
      }, 2000);
    } catch (error) {
      console.error("コピーに失敗しました:", error);
    }
  };

  const deleteWork = (workId: string) => {
    setCompletedWorks((prev) => prev.filter((work) => work.id !== workId));
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 音停止ボタン（音が鳴っている時のみ表示） */}
      {isPlaying && (
        <Card className="bg-yellow-50 border-yellow-300">
          <CardContent className="pt-6">
            <Button
              onClick={stopSound}
              className="w-full bg-red-500 hover:bg-red-600 text-white text-lg py-6"
              size="lg"
            >
              🔇 音を停止
            </Button>
          </CardContent>
        </Card>
      )}

      {/* タイマーカード */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center flex justify-between items-center">
            <span>{isBreak ? "休憩時間" : "ポモドーロタイマー"}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="text-xs px-2 py-1 h-auto"
              >
                ⚙️ 設定
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showSettings ? (
            <div className="space-y-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="workDuration">作業時間（分）</Label>
                <Input
                  id="workDuration"
                  name="workDuration"
                  type="number"
                  value={settings.workDuration}
                  onChange={handleSettingsChange}
                  min="1"
                  max="60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="breakDuration">休憩時間（分）</Label>
                <Input
                  id="breakDuration"
                  name="breakDuration"
                  type="number"
                  value={settings.breakDuration}
                  onChange={handleSettingsChange}
                  min="1"
                  max="60"
                />
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-7xl font-bold mb-8 py-6">
                {formatTime(timeLeft)}
              </div>
              <div className="space-y-4">
                <div className="space-x-4">
                  <Button
                    onClick={toggleTimer}
                    className={`px-8 ${
                      isRunning
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    {isRunning ? "一時停止" : "スタート"}
                  </Button>
                  <Button onClick={resetTimer} variant="outline">
                    リセット
                  </Button>
                </div>
                <div>
                  <Button
                    onClick={toggleMode}
                    variant="secondary"
                    className="text-sm"
                  >
                    {isBreak
                      ? "🎯 作業モードに切り替え"
                      : "☕️ 休憩モードに切り替え"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {/* 現在の作業タイトル（タイマーカード内） */}
        <CardContent className="pt-0">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-lg">現在の作業</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="text"
                placeholder="作業タイトルを入力..."
                value={currentTitle}
                onChange={(e) => setCurrentTitle(e.target.value)}
                className="text-lg bg-white"
              />
            </CardContent>
          </Card>
        </CardContent>

        <CardFooter className="justify-end">
          <a
            href="https://otologic.jp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-500"
          >
            Sound Effect: OtoLogic
          </a>
        </CardFooter>
      </Card>

      {/* 作業済みカード一覧 */}
      {completedWorks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">作業済み</h2>
          {completedWorks.map((work) => (
            <Card key={work.id} className="bg-green-50 border-green-200">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-lg font-semibold">✓ 完了</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteWork(work.id)}
                    className="text-xs text-red-500 hover:text-red-700 h-auto p-1"
                  >
                    削除
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  {work.duration}分 •{" "}
                  {work.startedAt.toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}{" "}
                  {work.startedAt.toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  〜
                  {work.completedAt.toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`title-${work.id}`}>作業タイトル</Label>
                  <Input
                    id={`title-${work.id}`}
                    type="text"
                    placeholder="タイトルを入力..."
                    value={work.title}
                    onChange={(e) => handleTitleChange(work.id, e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`reflection-${work.id}`}>感想</Label>
                  <Textarea
                    id={`reflection-${work.id}`}
                    placeholder="この作業の感想を記入..."
                    value={work.reflection}
                    onChange={(e) =>
                      handleReflectionChange(work.id, e.target.value)
                    }
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => copyWorkMessage(work)}
                    className="bg-blue-500 hover:bg-blue-600"
                    size="sm"
                  >
                    📋 コピー
                  </Button>
                  {editingWorkId === work.id && (
                    <span className="text-sm text-green-600">
                      ✓ コピーしました
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;
