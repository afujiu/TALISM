<!-------------------------------
ダッシュボード
--------------------------------->
<script>
	import { onMount, onDestroy } from 'svelte'
	import { goto } from '$app/navigation'
	import Loading from '$comp/Loading.svelte'

	let isLoading=$state(true)
	/**
	* ログインチェック
	*/
	onMount(() => {
		isLoading=false
	})
</script>
<article>
<Loading isLoading={isLoading}>アカウント設定</Loading>
</article>
<style>

</style>