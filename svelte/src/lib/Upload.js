/**
 * csvをアップロードしてjson形式で返す
 * @param {Array<Record<string, string>>} [replaceHeader]
 * 	ヘッダーの名前を置換[{'ほげ':'hoge'},{'ふが':'fuga}]
 *  ヘッダーが「ほげ」の場合は「hoge」にする
 */
export async function uploadCsvConvertJson(replaceHeader=[]) {
	const selectedFile = await new Promise((resolve, reject) => {
		if (typeof document === 'undefined') {
			reject(new Error('ブラウザ上で実行してください'))
			return
		}

		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.csv,text/csv'
		input.onchange = () => resolve(input.files?.[0])
		input.click()
	})
	if (!(selectedFile instanceof File)) {
		throw new TypeError('CSVファイルを指定してください')
	}

	const bytes = new Uint8Array(await selectedFile.arrayBuffer())
	let text
	try {
		text = new TextDecoder('utf-8', {fatal: true}).decode(bytes)
	} catch {
		text = new TextDecoder('shift_jis').decode(bytes)
	}
	text = text.replace(/^\uFEFF/, '')
	const rows = []
	let row = []
	let field = ''
	let quoted = false
	for (let index = 0; index < text.length; index += 1) {
		const character = text[index]
		const nextCharacter = text[index + 1]

		if (character === '"') {
			if (quoted && nextCharacter === '"') {
				field += '"'
				index += 1
			} else {
				quoted = !quoted
			}
		} else if (character === ',' && !quoted) {
			row.push(field)
			field = ''
		} else if ((character === '\n' || character === '\r') && !quoted) {
			if (character === '\r' && nextCharacter === '\n') index += 1
			row.push(field)
			rows.push(row)
			row = []
			field = ''
		} else {
			field += character
		}
	}
	if (field !== '' || row.length > 0) {
		row.push(field)
		rows.push(row)
	}
	if (quoted) throw new Error('CSVの引用符が閉じられていません')
	if (rows.length === 0) return []

	const headerRow = rows.shift()
	if (!headerRow) return []
	const headerReplacements = Object.assign({}, ...replaceHeader)
	const headers = headerRow.map((header) => {
		const normalizedHeader = header.trim()
		return String(headerReplacements[normalizedHeader] ?? normalizedHeader).toLowerCase()
	})

	return rows
		.filter((row) => row.some((value) => value !== ''))
		.map((row) => {
			const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']))
			const quantity = Number(record.quantity)
			return record
		})
}

/**
 * jsonファイルをアップロード
 * @param {Array<Record<string, string>>} [replaceHeader]
 * 	ヘッダーの名前を置換[{'ほげ':'hoge'},{'ふが':'fuga}]
 *  ヘッダーが「ほげ」の場合は「hoge」にする
 */
export async function uploadJson(replaceHeader=[]){
	const selectedFile = await new Promise((resolve, reject) => {
		if (typeof document === 'undefined') {
			reject(new Error('ブラウザ上で実行してください'))
			return
		}

		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.json,application/json'
		input.onchange = () => resolve(input.files?.[0])
		input.click()
	})
	if (!(selectedFile instanceof File)) {
		throw new TypeError('JSONファイルを指定してください')
	}

	const text = await selectedFile.text()
	const parsed = JSON.parse(text.replace(/^\uFEFF/, ''))
	const records = Array.isArray(parsed) ? parsed : [parsed]
	const headerReplacements = Object.assign({}, ...replaceHeader)

	return records.map((record) => {
		if (record === null || typeof record !== 'object' || Array.isArray(record)) {
			throw new TypeError('JSONの各要素はオブジェクトである必要があります')
		}
		return Object.fromEntries(
			Object.entries(record).map(([key, value]) => [
				headerReplacements[key] ?? key,
				value,
			])
		)
	})
}


/**
 * 画像をアップロード
 * @returns {Promise<{name:string, src:string, type:string, size:number, width:number, height:number}>}
 */
export async function uploadImageBase64(){
	const selectedFile = await new Promise((resolve, reject) => {
		if (typeof document === 'undefined') {
			reject(new Error('ブラウザ上で実行してください'))
			return
		}

		const input = document.createElement('input')
		input.type = 'file'
		const isMobileOrTablet = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
		input.onchange = () => resolve(input.files?.[0])
		input.click()
	})
	if (!(selectedFile instanceof File)) {
		throw new TypeError('画像ファイルを指定してください')
	}
	/** @type {string} */
	let src
	let imageSize
	if (selectedFile.type.startsWith('image/')) {
		src = await new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = () => {
				if (typeof reader.result === 'string') resolve(reader.result)
				else reject(new Error('画像の読み込みに失敗しました'))
			}
			reader.onerror = () => reject(reader.error ?? new Error('画像の読み込みに失敗しました'))
			reader.readAsDataURL(selectedFile)
		})
		imageSize = await new Promise((resolve, reject) => {
			const image = new Image()
			image.onload = () => resolve({width: image.naturalWidth, height: image.naturalHeight})
			image.onerror = () => reject(new Error('画像サイズの取得に失敗しました'))
			image.src = String(src)
		})
	} else if (selectedFile.type.startsWith('video/')) {
		const videoUrl = URL.createObjectURL(selectedFile)
		try {
			const frame = await new Promise((resolve, reject) => {
				const video = document.createElement('video')
				video.preload = 'metadata'
				video.muted = true
				video.playsInline = true
				video.onloadeddata = () => {
					const canvas = document.createElement('canvas')
					canvas.width = video.videoWidth
					canvas.height = video.videoHeight
					const context = canvas.getContext('2d')
					if (!context) {
						reject(new Error('Canvas 2Dコンテキスト取得失敗'))
						return
					}
					context.drawImage(video, 0, 0, canvas.width, canvas.height)
					resolve({
						src: canvas.toDataURL('image/jpeg', 0.9),
						width: canvas.width,
						height: canvas.height,
					})
				}
				video.onerror = () => reject(new Error('動画の読み込みに失敗しました'))
				video.src = videoUrl
			})
			src = frame.src
			imageSize = {width: frame.width, height: frame.height}
		} finally {
			URL.revokeObjectURL(videoUrl)
		}
	} else {
		throw new TypeError('画像または動画ファイルを指定してください')
	}

	return {
		name: selectedFile.name,
		src: String(src),
		type: selectedFile.type,
		size: selectedFile.size,
		width: imageSize.width,
		height: imageSize.height,
	}
}