"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import MicRecorder from "mic-recorder-to-mp3";

const recorder = new MicRecorder({ bitRate: 128, sampleRate: 16000 });

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const recordingTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current && isRecording) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const rms = Math.sqrt(
        dataArray.reduce((s, v) => s + v * v, 0) / dataArray.length
      );
      const normalizedLevel = Math.min(rms / 128, 1);
      setAudioLevel((prev) => prev * 0.7 + normalizedLevel * 0.3);
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(
        () => setRecordingDuration((p) => p + 1),
        1000
      );
      updateAudioLevel();
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingDuration(0);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording, updateAudioLevel]);

  const startRecording = useCallback(async () => {
    try {
      if (!("mediaDevices" in navigator) || !window.isSecureContext) {
        alert("Microphone access requires HTTPS.");
        return;
      }
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      await recorder.start();
      setIsRecording(true);
      updateAudioLevel();
    } catch (error: any) {
      console.error("Error starting recording:", error);
      if (
        error?.name === "NotAllowedError" ||
        error?.name === "PermissionDeniedError"
      ) {
        alert("Microphone permission denied.");
      } else if (error?.name === "NotFoundError") {
        alert("No microphone detected.");
      } else {
        alert("Failed to access microphone.");
      }
    }
  }, [updateAudioLevel]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!isRecording) return null;
    setIsProcessing(true);
    try {
      const [, blob] = await recorder.stop().getMp3();
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
        audioContextRef.current = null;
      }
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      setIsRecording(false);
      setAudioLevel(0);
      return blob && blob.size > 0 ? blob : null;
    } catch (error) {
      console.error("Error stopping recording:", error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
      }
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      try {
        (recorder as any)?._active && recorder.stop();
      } catch {}
    };
  }, []);

  const handleMouseDown = useCallback(() => {
    startRecording();
  }, [startRecording]);
  const handleMouseUp = useCallback(async () => {
    await stopRecording();
  }, [stopRecording]);

  return {
    isRecording,
    isProcessing,
    audioLevel,
    recordingDuration,
    handleMouseDown,
    handleMouseUp,
    setIsProcessing,
    stopRecording,
  };
}
