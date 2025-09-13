"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  Dispatch,
  SetStateAction,
} from "react";

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const onRecordingCompleteRef = useRef<(blob: Blob) => void>(() => {});

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
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setRecordingDuration(0);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording, updateAudioLevel]);

  const startRecording = useCallback(
    async (onComplete?: (blob: Blob) => void) => {
      try {
        console.log("Requesting mic access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000, // Lowered for better Whisper compatibility
            channelCount: 1,
          },
        });

        streamRef.current = stream;
        audioChunksRef.current = [];

        const audioContext = new AudioContext({ sampleRate: 16000 });
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm",
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            console.log(`Chunk received: ${event.data.size} bytes`);
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          console.log(`Recording stopped. Blob size: ${audioBlob.size} bytes`);

          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }
          if (audioContextRef.current) {
            audioContextRef.current.close();
          }
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }

          setIsRecording(false);
          setAudioLevel(0);
          setRecordingDuration(0);

          if (onComplete && audioBlob.size > 0) {
            onComplete(audioBlob);
          } else if (audioBlob.size === 0) {
            console.warn("Empty blob—retry recording");
          }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(100); // 100ms timeslice
        setIsRecording(true);
        onRecordingCompleteRef.current = onComplete || (() => {});
      } catch (error) {
        console.error("Error starting recording:", error);
        alert("Microphone access denied. Please allow and retry.");
      }
    },
    []
  );

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          resolve(audioBlob);
        };
        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }
    });
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const handleMouseDown = useCallback(() => {
    startRecording((blob) => {
      console.log("Hold released—processing blob");
    });
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
