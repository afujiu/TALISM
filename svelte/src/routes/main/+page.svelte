<!-------------------------------
ダッシュボード
--------------------------------->
<script>
	import { onMount, onDestroy } from 'svelte'
	import { goto } from '$app/navigation'
</script>
<article>
	ダッシュボード
	<button onclick={()=>{goto('/main/hoge')}}>menu</button>
</article>