<script lang="ts">
	import JsBarcode from 'jsbarcode'

	type BarcodeType = 'CODE39' | 'NW-7' | 'CODE128' | 'EAN-13'

	const formats: Record<BarcodeType, string> = {
		'CODE39': 'CODE39',
		'NW-7': 'codabar',
		'CODE128': 'CODE128',
		'EAN-13': 'EAN13'
	}

	let { code = '', type = 'NW-7' }: { code?: string; type?: BarcodeType } = $props()
	let barcodeElement: SVGSVGElement
	let errorMessage = $state('')

	$effect(() => {
		const value = code
		const barcodeType = type

		barcodeElement.replaceChildren()
		errorMessage = ''

		if (!value) return

		const format = formats[barcodeType]
		if (!format) {
			errorMessage = `未対応のバーコード形式です: ${barcodeType}`
			return
		}

		try {
			JsBarcode(barcodeElement, value, {
				format,
				displayValue: true,
				text: value,
				width: 3,
				height: 70,
				margin: 15
			})
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error)
		}
	})
</script>

<div class="barcode">
	<svg bind:this={barcodeElement} role="img" aria-label={`バーコード ${code}`}></svg>
	{#if errorMessage}
		<p class="barcode-error" role="alert">{errorMessage}</p>
	{/if}
</div>

<style>
	.barcode {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
	}

	svg {
		display: block;
		max-width: 100%;
		height: auto;
	}

	.barcode-error {
		margin: 0;
		color: #b91c1c;
	}
</style>