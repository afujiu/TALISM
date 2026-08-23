<script>
	import '../css/global.css'
	export const ssr = false
	export const prerender = true
	let { children } = $props()
</script>
<svelte:head>
</svelte:head>
<div class="base-layout">
		{@render children()}
</div>
<style>
.base-layout{
	position:fixed;
	top:0;
	bottom:0;
	left:0;
	right:0;
	overflow:hidden!important;
	height:100vh;
}
</style>