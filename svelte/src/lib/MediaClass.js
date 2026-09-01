import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
/**
 * メディア操作クラス
 */
export class MediaClass{
	/**
	 * fileからbase64にする
	 * @param {*} file 
	 * @returns base64
	 */
	static fileToBase64(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = () => resolve(reader.result)
			reader.onerror = reject
			reader.readAsDataURL(file)
		})
	}

	/**
	 * base64からfileを取得
	 * @param {*} base64 
	 * @param {*} fileName 
	 * @returns 
	 */
	static base64ToFile(base64, fileName = "image.png") {
		const [header, data] = base64.split(",");
		// MIMEタイプを取得
		const mime = header.match(/data:(.*?);base64/)[1];

		// Base64をバイナリへ変換
		const binary = atob(data);
		const bytes = new Uint8Array(binary.length);

		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}

		return new File([bytes], fileName, {
			type: mime
		});
	}

	/**
	 * アップロードファイルの画像サイズを取得
	 * @param {*} file 
	 */
	static getScreenSizeFile(file){
		return new Promise((resolve) => {
			// サイズを取得
			if(file.type.includes('image')){
				const imageUrl = URL.createObjectURL(file)
				const image = new Image()
				image.onload = () => {
					URL.revokeObjectURL(imageUrl)
					resolve({width:image.naturalWidth,height:image.naturalHeight})
				}
				image.onerror = () => {
					URL.revokeObjectURL(imageUrl)
					resolve({width:0,height:0})
				}
				image.src = imageUrl
			}else if(file.type.includes('video')){
				const videoUrl = URL.createObjectURL(file)
				const video = document.createElement('video')
				video.src = videoUrl
				video.onloadedmetadata = () => {
					const width = video.videoWidth
					const height = video.videoHeight
					URL.revokeObjectURL(videoUrl)
					resolve({width:width,height:height})
				}
				video.onerror = () => {
					URL.revokeObjectURL(videoUrl)
					resolve({width:0,height:0})
				}
			}
		})
	}

	/**
	 * base64データの画像サイズを取得
	 * @param {string} base64
	 */
	static getScreenSizeBase64(base64){
		return new Promise((resolve) => {
			if (typeof base64 !== 'string' || base64.trim() === '') {
				resolve({width:0,height:0})
				return
			}

			const mime = base64.match(/^data:(image|video)\/([^;,]+)[;,]/i)?.[1]?.toLowerCase()
			const src = base64.startsWith('data:') ? base64 : `data:${mime || 'image/jpeg'};base64,${base64}`

			if (mime === 'image') {
				const image = new Image()
				image.onload = () => resolve({width:image.naturalWidth,height:image.naturalHeight})
				image.onerror = () => resolve({width:0,height:0})
				image.src = src
			} else if (mime === 'video') {
				const video = document.createElement('video')
				video.src = src
				video.onloadedmetadata = () => resolve({width:video.videoWidth,height:video.videoHeight})
				video.onerror = () => resolve({width:0,height:0})
			}
		})
	}

	/**
	 * 画像のリサイズ
	 * base64
	 * @param {string} base64
	 * @returns {Promise<{ base64: string, size: number }>}
	 */
	static async resizeImage(src, widthSize = null) {
	return new Promise(async (resolve, reject) => {
		if (typeof src !== 'string' || src.trim() === '') {
			reject(new Error('base64画像データが空です'));
			return;
		}

		let imageData = src;
		let detectedMime =
			src.match(/^data:(image\/[^;,]+)[;,]/i)?.[1] || 'image/jpeg';

		// URLの場合は取得
		if (src.startsWith('http://') || src.startsWith('https://')) {
			try {
				const response = await fetch(src, { method: 'GET' });

				if (!response.ok) {
					throw new Error(`画像取得失敗: ${response.status}`);
				}

				const blob = await response.blob();
				detectedMime =
					blob.type.match(/^image\/[^;,]+/i)?.[0] || detectedMime;

				const file = new File([blob], 'downloaded-image', {
					type: detectedMime
				});

				imageData = await MediaClass.fileToBase64(file);
			} catch (error) {
				reject(
					new Error(
						error instanceof Error ? error.message : '画像取得失敗'
					)
				);
				return;
			}
		}

		const imageSrc = imageData.startsWith('data:')
			? imageData
			: `data:${detectedMime};base64,${imageData}`;

		const globalScope =
			/** @type {typeof globalThis & { RESIZE_SCALE?: number; MAX_LONG_EDGE?: number; JPEG_QUALITY?: number }} */
			(globalThis);

		const resizeScale =
			typeof globalScope.RESIZE_SCALE === 'number'
				? globalScope.RESIZE_SCALE
				: 0.35;

		const maxLongEdge =
			typeof globalScope.MAX_LONG_EDGE === 'number'
				? globalScope.MAX_LONG_EDGE
				: 1600;

		const jpegQuality =
			typeof globalScope.JPEG_QUALITY === 'number'
				? globalScope.JPEG_QUALITY
				: 0.7;

		const img = new Image();

		img.onload = () => {
			let targetWidth;
			let targetHeight;

			if (widthSize != null) {
				// 幅指定（比率維持）
				targetWidth = Math.max(1, Math.floor(widthSize));
				targetHeight = Math.max(
					1,
					Math.round(
						img.naturalHeight * (targetWidth / img.naturalWidth)
					)
				);
			} else {
				// 従来のリサイズ処理
				targetWidth = Math.max(
					1,
					Math.floor(img.naturalWidth * resizeScale)
				);
				targetHeight = Math.max(
					1,
					Math.floor(img.naturalHeight * resizeScale)
				);

				const longEdge = Math.max(targetWidth, targetHeight);

				if (longEdge > maxLongEdge) {
					const ratio = maxLongEdge / longEdge;
					targetWidth = Math.max(
						1,
						Math.floor(targetWidth * ratio)
					);
					targetHeight = Math.max(
						1,
						Math.floor(targetHeight * ratio)
					);
				}
			}

			const canvas = document.createElement('canvas');
			canvas.width = targetWidth;
			canvas.height = targetHeight;

			const ctx = canvas.getContext('2d');

			if (!ctx) {
				reject(new Error('Canvas 2Dコンテキスト取得失敗'));
				return;
			}

			ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

			canvas.toBlob(
				(blob) => {
					if (!blob) {
						reject(new Error('画像変換失敗'));
						return;
					}

					const reader = new FileReader();

					reader.onload = () => {
						resolve({
							base64:
								typeof reader.result === 'string'
									? reader.result
									: '',
							size: blob.size
						});
					};

					reader.onerror = () =>
						reject(new Error('base64変換失敗'));

					reader.readAsDataURL(blob);
				},
				detectedMime,
				jpegQuality
			);
		};

		img.onerror = () => {
			reject(new Error('画像デコード失敗'));
		};

		img.src = imageSrc;
	});
}

	/**
	 * webmビデオのデータを圧縮
	 * ※FFmpegを使用
	 * ※音声は保持されません
	 *
	 * @param {string} base64
	 * @returns {Promise<{base64:string,size:number}>}
	 */
	static async resizeVideo(base64) {
		if (typeof base64 !== 'string' || base64.trim() === '') {
			throw new Error('base64動画データが空です')
		}

		const ffmpeg = new FFmpeg()
		const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
		await ffmpeg.load({
			coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
			wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
		})

		const base64Data = base64.includes(',') ? base64.split(',')[1] : base64
		const binaryString = atob(base64Data)
		const len = binaryString.length
		const bytes = new Uint8Array(len)
		for (let i = 0; i < len; i++) {
			bytes[i] = binaryString.charCodeAt(i)
		}

		await ffmpeg.writeFile('input.webm', bytes)
		await ffmpeg.exec([
			'-i', 'input.webm',
			'-c:v', 'libvpx',
			'-crf', '30',
			'-b:v', '1M',
			'-c:a', 'libvorbis',
			'output.webm'
		])

		const data = await ffmpeg.readFile('output.webm')
		const dataAsString = typeof data === 'string' ? data : ''
		const bytesOut = dataAsString
			? new TextEncoder().encode(dataAsString)
			: new Uint8Array(data instanceof ArrayBuffer ? data : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)) : [])
		const webmBlob = new Blob([bytesOut], { type: 'video/webm' })
		const resultBase64 = await new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = () => resolve(reader.result)
			reader.onerror = () => reject(new Error('base64変換失敗'))
			reader.readAsDataURL(webmBlob)
		})

		await ffmpeg.deleteFile('input.webm')
		await ffmpeg.deleteFile('output.webm')

		return {
			base64: resultBase64,
			size: webmBlob.size
		}
	}

	/**
	 * MP4 / MOV の Base64動画を WebM(Base64)へ変換
	 *
	 * @param {string} base64
	 * @returns {Promise<{base64:string,size:number}>}
	 */
	static async convertVideoToWebm(base64) {

		if (!base64) {
			throw new Error("base64動画データが空です");
		}
		const mime = base64.match(/^data:(video\/[^;,]+)/i)?.[1] ?? "";

		if (mime.includes("webm")) {
			return {
				base64,
				size: Math.floor((base64.length * 3) / 4)
			};
		}

		const extension =
			mime.includes("quicktime") ? "mov" :
			mime.includes("mp4") ? "mp4" :
			"mp4";
		const ffmpeg = new FFmpeg();

		const baseURL =
			"https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

		await ffmpeg.load({
			coreURL: await toBlobURL(
				`${baseURL}/ffmpeg-core.js`,
				"text/javascript"
			),
			wasmURL: await toBlobURL(
				`${baseURL}/ffmpeg-core.wasm`,
				"application/wasm"
			)
		});

		const binary = atob(base64.split(",")[1]);
		const input = new Uint8Array(binary.length);

		for (let i = 0; i < binary.length; i++) {
			input[i] = binary.charCodeAt(i);
		}

		const inputName = `input.${extension}`;
		const outputName = "output.webm";

		await ffmpeg.writeFile(inputName, input)
		await ffmpeg.exec([
			"-i",
			inputName,
			"-vf", "scale=-2:480",
			"-c:v","libvpx",
			"-crf","32",
			"-b:v","0",
			"-c:a","libopus",

			outputName
		])
		const output = await ffmpeg.readFile(outputName);

		const blob = new Blob([output], {
			type: "video/webm"
		});

		const resultBase64 = await new Promise((resolve, reject) => {

			const reader = new FileReader();

			reader.onload = () => resolve(reader.result);

			reader.onerror = reject;

			reader.readAsDataURL(blob);

		});

		await ffmpeg.deleteFile(inputName);
		await ffmpeg.deleteFile(outputName);

		return {
			base64: resultBase64,
			size: blob.size
		};
	}

		
	/**
	 * コントラストを変更する
	 * @param {string} base64 Base64画像
	 * @param {number} value コントラスト(100=元画像)
	 * @returns {Promise<string>} 加工後のBase64
	 */
	static async contrast(base64, value = 100) {
		return new Promise((resolve, reject) => {
			if (typeof base64 !== 'string' || !base64.startsWith('data:image')) {
				reject(new Error('画像データが不正です'));
				return;
			}

			const img = new Image();

			img.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;

				const ctx = canvas.getContext('2d');

				// CSS filter を利用
				ctx.filter = `contrast(${value}%)`;
				ctx.drawImage(img, 0, 0);

				resolve(canvas.toDataURL());
			};

			img.onerror = () => {
				reject(new Error('画像の読み込みに失敗しました'));
			};

			img.src = base64;
		});
	}

	/**
	 * imageをクリッピング
	 * @param {*} img Image
	 * @param {*} x 
	 * @param {*} y 
	 * @param {*} width 
	 * @param {*} height 
	 * return clippingImage
	 */
	static async clipping(img,x,y,width,height){
		return new Promise((resolve, reject) => {
			try {
				const canvas = document.createElement("canvas");
				canvas.width = Math.max(1, Math.round(width));
				canvas.height = Math.max(1, Math.round(height));

				const ctx = canvas.getContext("2d");
				if (!ctx) {
					reject(new Error("Canvasの取得に失敗しました"));
					return;
				}

				ctx.drawImage(
					img,
					x,
					y,
					width,
					height,
					0,
					0,
					width,
					height
				);

				const clippedImage = new Image();

				clippedImage.onload = () => resolve(clippedImage);
				clippedImage.onerror = () =>
					reject(new Error("クリッピング画像の生成に失敗しました"));

				clippedImage.src = canvas.toDataURL("image/png");
			} catch (err) {
				reject(err);
			}
		});
	}
}