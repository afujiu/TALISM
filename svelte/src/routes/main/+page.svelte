<!-------------------------------
ダッシュボード
--------------------------------->
<script>

	import { MakeshopClass } from "$lib/MakeshopClass.js"
	import { onMount, onDestroy } from 'svelte'
	import { goto } from '$app/navigation'

	let iframe=$state(null)
	onMount(async () => {
		iframe = document.getElementById(('makeshopLogin'))
		const doc = iframe.contentDocument
		doc.open()
		doc.write(`
		<form action="https://www.makeshop.jp/main/newlogin.html" method="POST" name="loginform">
				<input name="ssl" value="OK">
				<input name="id" value="kitboy">
				<input name="passwd" value="C6ZczhqP!h4cw5#">
				<input name="idsave" value="Y">
				<input type="submit" value="submit">
		</form>
		`)
  })
</script>
<article>
	ダッシュボード
	<button onclick={()=>{goto('/main/hoge')}}>menu</button>
	<h1>フォント感じ</h1>
	<h2>ABCDEFGHIJI</h2>
	<h3>1234567890</h3>
	<iframe id="makeshopLogin"></iframe>
</article>