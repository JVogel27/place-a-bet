/**
 * Audio utility for playing sound effects
 */

/**
 * Play a cash register "ka-ching" sound using Web Audio API
 * This creates a synthesized sound without needing audio files
 */
export function playCashRegisterSound() {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const currentTime = audioContext.currentTime;

    // Create oscillators for the "ka-ching" effect
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Connect nodes
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure oscillators for a cash register sound
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';

    // Frequencies for a pleasant "cha-ching" sound
    oscillator1.frequency.setValueAtTime(800, currentTime);
    oscillator2.frequency.setValueAtTime(1200, currentTime);

    // Envelope for volume (attack-decay-sustain-release)
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.01); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.1, currentTime + 0.1); // Decay
    gainNode.gain.linearRampToValueAtTime(0.1, currentTime + 0.15); // Sustain
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3); // Release

    // Pitch bend for "ching" effect
    oscillator1.frequency.exponentialRampToValueAtTime(1000, currentTime + 0.05);
    oscillator2.frequency.exponentialRampToValueAtTime(1400, currentTime + 0.05);

    // Start and stop
    oscillator1.start(currentTime);
    oscillator2.start(currentTime);
    oscillator1.stop(currentTime + 0.3);
    oscillator2.stop(currentTime + 0.3);

    // Clean up after playing
    setTimeout(() => {
      audioContext.close();
    }, 400);
  } catch (error) {
    console.warn('Failed to play cash register sound:', error);
    // Gracefully fail if Web Audio API is not supported
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
