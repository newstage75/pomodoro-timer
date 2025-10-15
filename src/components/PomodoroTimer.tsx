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
  const [title, setTitle] = useState("");
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [reflection, setReflection] = useState("");
  const [completedDuration, setCompletedDuration] = useState(0);
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
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

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

  const copyCompletionMessage = async () => {
    const taskTitle = title || "タイトルなし";
    let message = `作業「${taskTitle}」を完了しました。（${completedDuration}分）`;

    if (reflection.trim()) {
      message += `\n\n感想:\n${reflection}`;
    }

    try {
      await navigator.clipboard.writeText(message);
      setShowCopyNotification(true);
      setTimeout(() => setShowCopyNotification(false), 3000);
    } catch (error) {
      console.error("コピーに失敗しました:", error);
    }
  };

  const handleTimerComplete = async () => {
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

      // 完了画面を表示
      setCompletedDuration(settings.workDuration);
      setShowCompletionScreen(true);
    } else {
      setIsBreak(false);
      setTimeLeft(settings.workDuration * 60);
    }
  };

  const handleCloseCompletionScreen = () => {
    setShowCompletionScreen(false);
    setReflection("");
    setIsBreak(true);
    setTimeLeft(settings.breakDuration * 60);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(
      isBreak ? settings.breakDuration * 60 : settings.workDuration * 60
    );
  };

  const toggleMode = () => {
    setIsRunning(false);
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <Card className="w-full max-w-md mx-auto relative">
      {showCompletionScreen ? (
        <>
          <CardHeader>
            <CardTitle className="text-center">
              🎉 作業完了！
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-md">
                <p className="text-sm text-gray-700">
                  <strong>作業:</strong> {title || "タイトルなし"}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>時間:</strong> {completedDuration}分
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reflection">感想（任意）</Label>
                <Textarea
                  id="reflection"
                  placeholder="この作業で学んだこと、気づいたことなどを記入してください..."
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  rows={5}
                />
              </div>

              {showCopyNotification && (
                <div className="p-2 bg-green-100 text-green-800 rounded-md text-sm text-center">
                  ✓ コピーしました
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={copyCompletionMessage}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  📋 コピー
                </Button>
                <Button
                  onClick={handleCloseCompletionScreen}
                  variant="outline"
                  className="flex-1"
                >
                  休憩開始
                </Button>
              </div>
            </div>
          </CardContent>
        </>
      ) : (
        <>
          <CardHeader>
            <CardTitle className="text-center flex justify-between items-center">
              <span>{isBreak ? "休憩時間" : "ポモドーロタイマー"}</span>
              <div className="flex items-center gap-2">
                {isPlaying && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stopSound}
                    className="text-xs px-2 py-1 h-auto"
                  >
                    🔇 音を停止
                  </Button>
                )}
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
            {!isBreak && (
              <div className="mb-6">
                <Label htmlFor="title" className="text-sm text-gray-600">
                  作業タイトル
                </Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="例: レポート作成"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isRunning}
                  className="mt-2 text-center"
                />
              </div>
            )}
            <div className="text-6xl font-bold mb-8">
              {formatTime(timeLeft)}
            </div>
            {showCopyNotification && (
              <div className="mb-4 p-2 bg-green-100 text-green-800 rounded-md text-sm">
                ✓ 完了メッセージをコピーしました
              </div>
            )}
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
        </>
      )}
    </Card>
  );
};

export default PomodoroTimer;
