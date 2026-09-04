<script>
	import { onMount } from "svelte"
	//isActive(true:公開,false:ローディング)
	let { isLoading = $bindable(false)} = $props()
	onMount(async() => {
	})
</script>
<span class="page">
	{#if isLoading}
		<span class="loading">
			<span class="loading-spinner"></span>
			<span class="loading-text">Loading</span>
		</span>
	{:else}
		<slot/>
	{/if}
</span>
<style>
	.page{
		display:block;
		width:100%;
		height:100%;
		position:relative;
		overflow:auto;
	}
	.loading{
		display:flex;
		flex-direction:column;
		align-items:center;
		justify-content:center;
		width:100%;
		height:100%;
		gap:0.75em;
		color:#4b5563;
	}
	.loading-spinner{
		width:2.5em;
		height:2.5em;
		border:0.25em solid rgba(75,85,99,0.2);
		border-top-color:#2f8f5f;
		border-radius:50%;
		animation:spin 0.8s linear infinite;
	}
	.loading-text{
		font-size:0.95em;
		letter-spacing:0.08em;
		text-transform:uppercase;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>