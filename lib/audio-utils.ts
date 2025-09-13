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

        audio.onended = () => {
          // Only cleanup if this play is still current
          if (localToken === this.playToken) cleanup();
          resolve();
        };

        audio.onerror = (err) => {
          if (localToken === this.playToken) cleanup();
          reject(err);
        };

        audio.oncanplaythrough = () => {
          // If we were stopped before playback, don't start
          if (localToken !== this.playToken) {
            cleanup();
            resolve();
            return;
          }
          audio.play().catch((err) => {
            // If stopped between canplay and play, treat as resolved
            if (localToken !== this.playToken) {
              cleanup();
              resolve();
              return;
            }
            cleanup();
            reject(err);
          });
        };
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
        // Clearing the source prevents some browsers from resuming it later
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
    // placeholder for real conversion if you add it later
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

// Singleton instance
export const audioManager = new AudioManager();
