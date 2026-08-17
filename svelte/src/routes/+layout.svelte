<script>
	import '../app.css';
	export const ssr = false
	export const prerender = true
	let { children } = $props()
</script>
<svelte:head>
</svelte:head>
{@render children()}
