// A short two-note chime for something that needs the dispatcher (a takeover request, a new board alert), made with
// the Web Audio API so there's no sound file to load. Browsers only play sound after the page has been clicked or
// typed in once; before that it's silently skipped.
let audio: AudioContext | null = null

export function chime() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
    const start = audio.currentTime
    for (const [k, hz] of [880, 1175].entries()) {
      const tone = audio.createOscillator()
      const level = audio.createGain()
      const at = start + k * 0.18
      tone.frequency.value = hz
      level.gain.setValueAtTime(0.0001, at)
      level.gain.exponentialRampToValueAtTime(0.2, at + 0.02)
      level.gain.exponentialRampToValueAtTime(0.0001, at + 0.35)
      tone.connect(level).connect(audio.destination)
      tone.start(at)
      tone.stop(at + 0.4)
    }
  } catch {
    // No Web Audio here: nothing to play.
  }
}
