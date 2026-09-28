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
/**
 * 音声
 * @param {} text 
 */
export function speak(str){
	
	const text = new SpeechSynthesisUtterance(str)
	text.lang = 'ja-JP'
	text.volume = 1.0; // 0～1
	text.rate = 0.8;   // 読み上げ速度
	text.pitch = 1.0;  // 声の高さ
	console.log(text)
	speechSynthesis.speak(text)
}