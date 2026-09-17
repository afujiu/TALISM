/**
 * csvをアップロードしてjson形式で返す
 * @param {File | undefined} [file]
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