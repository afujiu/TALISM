<!-------------------------------
インプット要素
--------------------------------->
<script>
	import { onMount } from 'svelte'
	/**
	 * type:
	 * 	text,
	 * 	date,
	 * 	time,
	 * 	date-time
	 * 	number(min.max,step),
	 * 	select(list),
	 * 	textarea,
	 * readonly: true or false
	 */
	let { value = $bindable(null), type = 'text',list=[],placeholder='',exclass='',
		min=null,max=null,step=null,
		readonly=false
	} = $props()
</script>
{#if type=='number'}
	<input type="number" bind:value={value} min={min} max={max} step={step} placeholder={placeholder} class={exclass} {readonly}/>
{:else if type=='textarea'}
	<textarea bind:value={value} placeholder={placeholder} class={exclass} {readonly}></textarea>
{:else if type=='date-time'}
	<input type="datetime-local" bind:value={value} placeholder={placeholder} class={exclass} {readonly}/>
{:else if type=='textarea'}
	<textarea bind:value={value} placeholder={placeholder} class={exclass} {readonly}></textarea>
{:else}
	<input type={type} bind:value={value} placeholder={placeholder} class={exclass} {readonly}/>
{/if}
<style>
	input,textarea{
		display: block;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
		border-radius: 0;
		border:none;
		outline:none;
	}
	input:read-only,textarea:read-only{
		background:gray;
	}
</style>