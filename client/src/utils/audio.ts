/**
 * Audio utility for playing sound effects
 */

// Import the cash register sound
import cashRegisterSound from '../audio/cash-register.mp3';

/**
 * Play a cash register "ka-ching" sound from audio file
 */
export function playCashRegisterSound() {
  try {
    const audio = new Audio(cashRegisterSound);
    audio.volume = 0.5; // 50% volume to avoid being too loud
    audio.play().catch(error => {
      console.warn('Failed to play cash register sound:', error);
      // Gracefully fail if audio playback is blocked (e.g., autoplay policy)
    });
  } catch (error) {
    console.warn('Failed to create audio element:', error);
  }
}

/**
 * Play a success sound (higher pitched, more celebratory)
 */
export function playSuccessSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const currentTime = audioContext.currentTime;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';

    // Rising pitch for success
    oscillator.frequency.setValueAtTime(440, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, currentTime + 0.1);
    oscillator.frequency.exponentialRampToValueAtTime(660, currentTime + 0.2);

    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.25);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.25);

    setTimeout(() => {
      audioContext.close();
    }, 300);
  } catch (error) {
    console.warn('Failed to play success sound:', error);
  }
}
