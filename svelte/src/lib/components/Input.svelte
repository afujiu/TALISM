<!-------------------------------
インプット要素
--------------------------------->
<script>
	/**
	 * type:
	 * 	text,
	 * 	date,
	 * 	time,
	 * 	date-time
	 * 	number(min.max,step),
	 * 	select(list),
	 *  datalist(list),
	 * 	textarea,
	 * readonly: true or false
	 */
	let { value = $bindable(null), type = 'text',list=[],placeholder='',exclass='',datalistId='input-datalist',
		min=null,max=null,step=null,
		readonly=false
	} = $props()

	/** @param {unknown} option */
	function optionValue(option) {
		if (typeof option === 'object' && option !== null) {
			/** @type {{ value?: string | number }} */
			const item = option
			return item.value
		}
		return option
	}

	/** @param {unknown} option */
	function optionLabel(option) {
		if (typeof option !== 'object' || option === null) {
			return option
		}
		/** @type {{ label?: string, name?: string, value?: string | number }} */
		const item = option
		return item.label ?? item.name ?? item.value
	}

	/** @param {number} delta */
	function changeNumber(delta) {
		const increment = Number(step) || 1
		const current = Number(value)
		const base = Number.isNaN(current) ? (min !== null ? Number(min) : 0) : current
		let next = base + (increment * delta)
		if (min !== null && next < Number(min)) next = Number(min)
		if (max !== null && next > Number(max)) next = Number(max)
		value = next
	}
</script>
{#if type=='number'}
	<div class="number-input">
		<button type="button" class="number-button" onclick={() => changeNumber(-1)} disabled={readonly}>-</button>
		<input type="number" bind:value={value} min={min} max={max} step={step} placeholder={placeholder} class={exclass} {readonly}/>
		<button type="button" class="number-button" onclick={() => changeNumber(1)} disabled={readonly}>+</button>
	</div>
{:else if type=='datalist'}
	<input type="text" bind:value={value} list={datalistId} placeholder={placeholder} class={exclass} {readonly}/>
	<datalist id={datalistId}>
		{#each list as option}
			<option value={optionValue(option)} label={optionLabel(option)}></option>
		{/each}
	</datalist>
{:else if type=='select'}
	<select bind:value={value} class={exclass} disabled={readonly}>
		{#if placeholder}
			<option value="" disabled>{placeholder}</option>
		{/if}
		{#each list as option}
			<option value={optionValue(option)}>{optionLabel(option)}</option>
		{/each}
	</select>
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
	input,textarea,select{
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
	.number-input{
		display: flex;
		width: 100%;
		height: 100%;
	}
	.number-input .number-button{
		display: none;
	}
	.number-input input{
		min-width: 0;
	}
	@media (max-width: 1024px){
		.number-input .number-button{
			display: block;
			flex: 0 0 1rem;
			padding: 0;
			border: none;
			border-radius: 0;
			background: #e5e7eb;
			color: #1f2937;
			font-size: rem;
			line-height: 1;
		}
		.number-input .number-button:active:not(:disabled){
			background: #cbd5e1;
		}
		.number-input .number-button:disabled{
			cursor: not-allowed;
			opacity: 0.5;
		}
	}
</style>