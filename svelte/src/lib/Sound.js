/**
 * 「ピッ」という音を出力
 */
export function piSound() {
	const ctx = new (window.AudioContext || window.webkitAudioContext)();
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = 'sine';
	osc.frequency.value = 1500; // 1kHz
	gain.gain.value = 0.2;
	osc.connect(gain);
	gain.connect(ctx.destination);
	osc.start();
	osc.stop(ctx.currentTime + 0.08); // 80ms
	osc.onended = () => ctx.close();
}