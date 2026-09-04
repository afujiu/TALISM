<script>
	/*******************
	 * argument
	*/
	let { disabled = $bindable(false), children } = $props()
	let fabElement = $state(/** @type {HTMLSpanElement | null} */ (null))
	/*******************
	 * function
	*/
	function syncDisabledState() {
		if (!fabElement) return
		fabElement.querySelectorAll('button').forEach((/** @type {HTMLButtonElement} */ button) => {
			button.disabled = disabled
		})
	}

	$effect(() => {
		syncDisabledState()
	})
</script>
<span bind:this={fabElement} class="fab" class:disabled={disabled}>
	{#if children}
		{@render children()}
	{/if}
</span>
<div class="fab-buffer"></div>
<style>
	.fab{
		display:flex;
		position:fixed;
		left:0;
		right:0;
		bottom:var(--footer-height);
		width:40em;
		height:3em;
		margin: 0 auto;
		z-index:950;
	}
	.fab-buffer{
		height:3em;
	}

	@media (max-width: 767px) {
		.fab{
			width:100%;
			height:3.5em;
		}
		.fab-buffer{
			height:3.5em;
		}
	}
</style>