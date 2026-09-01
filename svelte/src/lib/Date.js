export function nowDateYMD(){
	const nowDate = new Date();
	const yyyy = nowDate.getFullYear()
	const mm = String(nowDate.getMonth() + 1).padStart(2, "0")
	const dd = String(nowDate.getDate()).padStart(2, "0")
	return `${yyyy}-${mm}-${dd}`
}
export function ymdhm(){
	const nowDate = new Date();
	const yyyy = nowDate.getFullYear()
	const mm = String(nowDate.getMonth() + 1).padStart(2, "0")
	const dd = String(nowDate.getDate()).padStart(2, "0")
	const hh = String(nowDate.getHours()).padStart(2, "0")
	const mi = String(nowDate.getMinutes()).padStart(2, "0")
	return `${yyyy}${mm}${dd}${hh}${mi}`
}
