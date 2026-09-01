<script>
	// type:number,byte(KB MB GBを表示),yen,time,date
	//
	let { value = $bindable(null), type = 'number', comma = false, } = $props();

	function formatValue() {
		if (value === null || value === undefined || value === '') {
			return ''
		}

		if (type === 'byte') {
			const num = Number(value)
			if (Number.isNaN(num)) {
				return value
			}

			const units = ['B', 'KB', 'MB', 'GB', 'TB']
			let size = num
			let unitIndex = 0
			while (size >= 1024 && unitIndex < units.length - 1) {
				size /= 1024
				unitIndex += 1
			}

			const formatted = size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)
			return `${formatted} ${units[unitIndex]}`
		}

		if (type === 'yen') {
			const num = Number(value)
			if (Number.isNaN(num)) {
				return value
			}
			return `¥${num.toLocaleString()}`
		}

		if (type === 'time') {
			const date = value instanceof Date ? value : new Date(value)
			if (Number.isNaN(date.getTime())) {
				return value
			}
			return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
		}

		if (type === 'date') {
			const date = value instanceof Date ? value : new Date(value)
			if (Number.isNaN(date.getTime())) {
				return value
			}
			const week = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
			return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}(${week})`
		}

		if (comma) {
			const num = Number(value)
			if (Number.isNaN(num)) {
				return value
			}
			return num.toLocaleString()
		}

		return value
	}
</script>
<span>{formatValue()}</span>