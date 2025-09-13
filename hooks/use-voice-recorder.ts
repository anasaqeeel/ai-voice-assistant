"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  Dispatch,
  SetStateAction,
} from "react";
import MicRecorder from "mic-recorder-to-mp3";

const recorder = new MicRecorder({
  bitRate: 128,
  sampleRate: 16000, // Matches Whisper preference
});

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
        dataArray.reduce((sum, value) => sum + value * value, 0) /
          dataArray.length
      );
      const normalizedLevel = Math.min(rms / 128, 1);
      setAudioLevel((prev) => prev * 0.7 + normalizedLevel * 0.3);
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      console.log("Recording started");
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
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
      console.log("Requesting mic access...");
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      await recorder.start();
      setIsRecording(true);
      updateAudioLevel();
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Microphone access denied. Please allow and retry.");
    }
  }, [updateAudioLevel]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!isRecording) return null;
    setIsProcessing(true);
    try {
      const [buffer, blob] = await recorder.stop().getMp3();
      console.log(`Recording stopped. MP3 size: ${blob.size} bytes`);

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsRecording(false);
      setAudioLevel(0);

      return blob.size > 0 ? blob : null;
    } catch (error) {
      console.error("Error stopping recording:", error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const handleMouseDown = useCallback(() => {
    startRecording();
  }, [startRecording]);

  const handleMouseUp = useCallback(async () => {
    const blob = await stopRecording();
    if (blob && blob.size > 0) {
      console.log("Blob ready for send:", blob.size);
    }
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
