<!-------------------------------
ダッシュボード
--------------------------------->
<script>
	import { onMount, onDestroy } from 'svelte'
	import { goto } from '$app/navigation'
	import { account,ui } from '$lib/store'
	import Loading from '$comp/Loading.svelte'

	let isLoading=$state(true)
	/**
	* ログインチェック
	*/
	onMount(() => {
		isLoading=false
	})
	/**
	 * 
	 */
	function logout(){
		$account.logout()
		return
	}
</script>
<article>
<Loading isLoading={isLoading}>
<button onclick={logout}>ログアウト</button>



</Loading>
</article>
<style>

</style>