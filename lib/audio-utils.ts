export class AudioManager {
  private audioContext: AudioContext | null = null
  private currentAudio: HTMLAudioElement | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  async playAudioBlob(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Stop any currently playing audio
        this.stopCurrentAudio()

        const audio = new Audio()
        const url = URL.createObjectURL(blob)

        audio.src = url
        audio.preload = "auto"

        audio.onended = () => {
          URL.revokeObjectURL(url)
          this.currentAudio = null
          resolve()
        }

        audio.onerror = (error) => {
          URL.revokeObjectURL(url)
          this.currentAudio = null
          reject(error)
        }

        audio.oncanplaythrough = () => {
          audio.play().catch(reject)
        }

        this.currentAudio = audio
      } catch (error) {
        reject(error)
      }
    })
  }

  stopCurrentAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }
  }

  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume()
    }
  }

  // Convert audio blob to different formats if needed
  async convertAudioFormat(blob: Blob, targetType: string): Promise<Blob> {
    // This is a placeholder for audio format conversion
    // In a real implementation, you might use libraries like ffmpeg.wasm
    return blob
  }

  // Get audio duration without playing
  async getAudioDuration(blob: Blob): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio()
      const url = URL.createObjectURL(blob)

      audio.src = url
      audio.preload = "metadata"

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        resolve(audio.duration)
      }

      audio.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("Failed to load audio metadata"))
      }
    })
  }
}

// Singleton instance
export const audioManager = new AudioManager()
