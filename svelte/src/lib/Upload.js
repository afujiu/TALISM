/**
 * csvをアップロードしてjson形式で返す
 */
/** @param {File | undefined} [file] */
export async function uploadCsvConvertJson(file) {
	const selectedFile = file ?? await new Promise((resolve, reject) => {
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

	const text = (await selectedFile.text()).replace(/^\uFEFF/, '')
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
	const headers = headerRow.map((header) => header.trim().toLowerCase())
	const requiredHeaders = ['seriescode', 'quantity', 'jancode', 'name']
	const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header))
	if (missingHeaders.length > 0) {
		throw new Error(`CSVに必要な列がありません: ${missingHeaders.join(', ')}`)
	}

	return rows
		.filter((row) => row.some((value) => value !== ''))
		.map((row) => {
			const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']))
			const quantity = Number(record.quantity)
			if (record.quantity === '' || !Number.isFinite(quantity)) {
				throw new Error(`quantityが数値ではありません: ${record.quantity}`)
			}

			return {
				seriescode: record.seriescode,
				jancode: record.jancode,
				name: record.name,
				quantity,
			}
		})
}
