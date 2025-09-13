export class AudioManager {
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;
  private playToken = 0; // invalidates pending playback when we stop

  constructor() {
    if (typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
  }

  async playAudioBlob(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Invalidate any pending play and stop current audio immediately
        this.stopCurrentAudio();

        const localToken = ++this.playToken;
        const audio = new Audio();
        const url = URL.createObjectURL(blob);

        this.currentAudio = audio;
        this.currentUrl = url;

        audio.src = url;
        audio.preload = "auto";
        audio.crossOrigin = "anonymous";

        const cleanup = () => {
          if (this.currentUrl) {
            try {
              URL.revokeObjectURL(this.currentUrl);
            } catch {}
          }
          if (this.currentAudio) {
            try {
              this.currentAudio.src = "";
            } catch {}
          }
          this.currentAudio = null;
          this.currentUrl = null;
        };

        const done = (ok = true, err?: unknown) => {
          if (localToken !== this.playToken) {
            // already invalidated
            cleanup();
            ok ? resolve() : reject(err);
            return;
          }
          cleanup();
          ok ? resolve() : reject(err);
        };

        const attemptPlay = async (retry = false) => {
          if (localToken !== this.playToken) return done(true);
          try {
            // If AudioContext got suspended mid-flight, resume once
            if (this.audioContext && this.audioContext.state === "suspended") {
              try {
                await this.audioContext.resume();
              } catch {}
            }
            await audio.play();
            // success: let onended resolve
          } catch (err: any) {
            // If we were stopped while play() was pending, resolve silently
            if (localToken !== this.playToken) return done(true);

            // Autoplay or transient "play() was interrupted" → retry once after a tick
            const name = err?.name || "";
            const msg = (err?.message || "").toLowerCase();
            const isAutoplay = name === "NotAllowedError";
            const isInterrupted =
              msg.includes("interrupted") || msg.includes("abort");

            if (!retry && (isAutoplay || isInterrupted)) {
              // small delay before retry helps Safari/Android
              setTimeout(() => attemptPlay(true), 50);
              return;
            }

            // Unrecoverable: fail this play but clean up
            done(false, err ?? new Error("Audio play failed"));
          }
        };

        const onReady = () => {
          // start ASAP (reduces perceived delay)
          attemptPlay(false);
        };

        // Whichever fires first will start playback
        audio.oncanplay = onReady;
        audio.onloadeddata = onReady;

        audio.onended = () => done(true);
        audio.onerror = (err) => done(false, err);
      } catch (error) {
        reject(error);
      }
    });
  }

  stopCurrentAudio(): void {
    // Invalidate any pending playback
    this.playToken++;
    // Stop current element hard
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = "";
      } catch {}
    }
    if (this.currentUrl) {
      try {
        URL.revokeObjectURL(this.currentUrl);
      } catch {}
    }
    this.currentAudio = null;
    this.currentUrl = null;
  }

  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  async convertAudioFormat(blob: Blob, _targetType: string): Promise<Blob> {
    return blob;
  }

  async getAudioDuration(blob: Blob): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(blob);
      audio.src = url;
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load audio metadata"));
      };
    });
  }
}

export const audioManager = new AudioManager();
