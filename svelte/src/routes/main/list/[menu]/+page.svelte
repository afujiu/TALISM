<!-------------------------------
	リスト汎用ページ
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
	list
	<Fab>
		<span class="f1">
			<button class="btn reset-btn">Reset</button>
		</span>
		<span class="f1">
			<button class="btn confirm-btn">Save</button>
		</span>
	</Fab>
</article>
<style>
</style>