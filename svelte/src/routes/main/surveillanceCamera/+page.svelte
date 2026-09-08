<!-------------------------------
ダッシュボード
--------------------------------->
<script>
	import { onMount, onDestroy } from 'svelte'
	import { account,ui } from '$lib/store'
	import Fab from '$comp/Fab.svelte'
	import WebrtcSender from '$comp/WebrtcSender.svelte';
	import WebrtcReceiver from '$comp/WebrtcReceiver.svelte';
	onMount(async () => {
	})
</script>
<article>
	<WebrtcSender></WebrtcSender>
	<WebrtcReceiver></WebrtcReceiver>
</article>
<style>
</style>