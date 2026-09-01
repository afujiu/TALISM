<!-------------------------------
	フォーム汎用ページ
--------------------------------->
<script>
	import { onMount, onDestroy } from 'svelte'
	import { account,ui } from '$lib/store'
	import Fab from '$comp/Fab.svelte'

	let val=$state('')
	onMount(async () => {
		//console.log(await $account.getDb('settingss'))
	})
</script>
<article>
	フォーム
</article>
<style>
</style>