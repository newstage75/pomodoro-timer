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

      setIsBreak(true);
      setTimeLeft(settings.breakDuration * 60);
    } else {
      setIsBreak(false);
      setTimeLeft(settings.workDuration * 60);
    }
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
            <div className="text-6xl font-bold mb-8">
              {formatTime(timeLeft)}
            </div>
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
    </Card>
  );
};

export default PomodoroTimer;
