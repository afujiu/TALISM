import Quagga from "@ericblade/quagga2";
/**
 * バーコード処理一覧
 */
export class Barcode {
	constructor(){}

	/**
	 * DOM要素またはID文字列を解決する
	 * @param {HTMLElement|string|null|undefined} elementOrId
	 * @returns {HTMLElement|null}
	 */
	static resolveElement(elementOrId) {
		if (!elementOrId) {
			return null;
		}
		return typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
	}

	/**
	 * quaggaを起動して、検出時にコールバックを呼び続ける
	 * @param {HTMLElement|string} target - カメラ映像を表示する要素またはそのID
	 * @param {HTMLCanvasElement|string|null} previewCanvas - カメラ映像を描画するcanvasまたはそのID
	 * @param {(code: string) => void} onDetected - 検出時に呼ばれるコールバック
	 * @returns {Promise<() => void>} - 停止関数
	 */
	static scan(target = 'barcode-scanner', previewCanvas = null, onDetected = () => {}) {
		return new Promise((resolve, reject) => {
			const targetEl = Barcode.resolveElement(target);
			const previewCanvasEl = Barcode.resolveElement(previewCanvas);
			if (!targetEl) {
				reject(new Error('barcode scanner target element not found'));
				return;
			}

			/** @type {((result: any) => void) | undefined} */
			let detectedHandler;
			/** @type {number | undefined} */
			let drawFrameId;
			let lastCode = '';
			let lastDetectedAt = 0;
			const duplicateDelay = 1500;
			const drawPreview = () => {
				if (!(previewCanvasEl instanceof HTMLCanvasElement)) {
					return;
				}

				const video = targetEl.querySelector('video');
				if (!(video instanceof HTMLVideoElement)) {
					drawFrameId = requestAnimationFrame(drawPreview);
					return;
				}
				if (video.readyState < 2) {
					drawFrameId = requestAnimationFrame(drawPreview);
					return;
				}

				const previewCtx = previewCanvasEl.getContext('2d');
				if (!previewCtx) {
					return;
				}

				if (previewCanvasEl.width !== video.videoWidth || previewCanvasEl.height !== video.videoHeight) {
					previewCanvasEl.width = video.videoWidth;
					previewCanvasEl.height = video.videoHeight;
				}

				previewCtx.drawImage(video, 0, 0, previewCanvasEl.width, previewCanvasEl.height);
				drawFrameId = requestAnimationFrame(drawPreview);
			};

			const cleanup = () => {
				if (detectedHandler) {
					Quagga.offDetected(detectedHandler);
				}
				if (drawFrameId !== undefined) {
					cancelAnimationFrame(drawFrameId);
				}
				try {
					Quagga.stop();
				} catch (_e) {
					// no-op
				}
			};

			/** @type {any} */
			const config = {
				inputStream: {
					type: 'LiveStream',
					target: targetEl,
					constraints: {
						facingMode: 'environment',
						width: { ideal: 900 },
						height: { ideal: 300 }
					}
				},
				decoder: {
					// JANコード(EAN-13)を読むために ean_reader を含める
					readers: ['ean_reader', 'ean_8_reader', 'code_128_reader', 'upc_reader']
				},
				locate: true
			};

			Quagga.init(config, function(/** @type {any} */ err) {
				if (err) {
					cleanup();
					reject(err);
					return;
				}

				detectedHandler = function(/** @type {any} */ result) {
					const code = result && result.codeResult && result.codeResult.code;
					const format = result && result.codeResult && result.codeResult.format;
					if (code && (!format || format === 'ean_13') && code.length === 13) {
						const now = Date.now();
						if (code === lastCode && now - lastDetectedAt < duplicateDelay) {
							return;
						}
						lastCode = code;
						lastDetectedAt = now;
						onDetected(code);
					}
				};
				Quagga.onDetected(detectedHandler);
				Quagga.start();
				drawPreview();
					resolve(cleanup);
			});
		});
	}

	static stop() {
		try {
			Quagga.stop();
		} catch (_e) {
			// no-op
		}
	}
}