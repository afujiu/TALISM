<!-------------------------------
ダッシュボード
--------------------------------->
<script>
	import { onMount, onDestroy } from 'svelte'
	import { account,ui } from '$lib/store'
	import Input from '$comp/Input.svelte'

	let val=$state('')
	onMount(async () => {
		//console.log(await $account.getDb('settingss'))
	})
</script>
<article>
<div class="flex">
	<div class="f1">
		<Input bind:value={val} type="number" step=10 min=10 max=50 placeholder="これは" readonly></Input>
	</div>
	<div class="f1">
		<Input bind:value={val} type="textarea" placeholder="これは"></Input>
	</div>
	<div class="f1">c</div>
</div>
{val}
</article>
<style>
	.f1{
		border:solid 1px;
		height:400px;
	}
</style>