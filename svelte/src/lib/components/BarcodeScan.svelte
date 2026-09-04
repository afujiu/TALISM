<script lang="ts">
import { onDestroy, onMount } from 'svelte';
import { createEventDispatcher } from 'svelte';
import {Barcode} from '$lib/Barcode.js' 

let code;
const dispatch = createEventDispatcher();
let stopScan: null | (() => void) = null;

onMount(async() => {
	code=""
	try {
		stopScan = await Barcode.scan('barcodeScanner', 'barcodePreview', (nextCode) => {
			code = nextCode;
			dispatch('change', { code });
		});
	} catch (error) {
		dispatch('scanError', { error });
	}
});

onDestroy(() => {
	stopScan?.();
});

</script>
	<div id="barcodeScanner" style="width: 100%; 100%;display:block;"></div>
	<canvas id="barcodePreview"></canvas>
<style>
	#barcodeScanner{
		display:none!important;
		position:fixed;
		right:100%;
		bottom:100%;
	}
	#barcodePreview{
		display:flex;
		justify-content: center;
		left:0;
		right:0;
		margin:auto;
		width:80%;
		height:100%;
	}
</style>
