<script>
  import { createEventDispatcher } from "svelte"
	const dispatch = createEventDispatcher()

	let { value = $bindable(),placeholder } = $props();

	/*******************
	 * argument
	*/
	let pressTimer;
	async function loadFile(file) {
		if (!file) return;
		value = await file.text();
	}

	/*******************
	 * function
	*/

	/**
	 * テキスト変更時
	 * @param e
	 */
	function change() {
		dispatch("change", {})
	}

	function startPress() {
		pressTimer = setTimeout(() => {
			document.getElementById('file-input').click();
		}, 400); // 0.8秒長押し
	}

	function endPress() {
		clearTimeout(pressTimer);
	}

	async function handleFileSelect(event) {
		const file = event.target.files?.[0];
		await loadFile(file);
		change()
	}
</script>

<input
	id="file-input"
	type="file"
	accept=".txt,.json"
	onchange={handleFileSelect}
	style="display:none"
/>

<textarea
	bind:value={value}
	onchange={change}
	rows="20"
	style="width:100%;"
	ontouchstart={startPress}
	ontouchend={endPress}
	ontouchcancel={endPress}
	onmousedown={startPress}
	onmouseup={endPress}
	onmouseleave={endPress}
	placeholder="{placeholder}（長押しorドラッグ&ドロップでファイル展開）"
></textarea>