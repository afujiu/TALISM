<!-------------------------------
	棚卸し
--------------------------------->
<script>
	import { onMount, onDestroy } from 'svelte'
	import { account,ui } from '$lib/store'
	import { DexieClass } from '$lib/DexieClass.js'
  import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { ProductsClass } from '$lib/ProductsClass.js'
	import {uploadCsvConvertJson,downloadCsv} from '$lib/Upload.js'
  import Input from "$comp/Input.svelte"
	import Accordion from '$lib/components/Accordion.svelte'
  /*******************
   * argument
   */

	let data = $state([])
	let realMakerList = $state([])
	let isMakerNull = $state(false)
	/**
	 * アップロード
	 */
	async function upload(){
		data = await uploadCsvConvertJson()
		 const now = Date.now()
		for(const val of data){
			val.name = ProductsClass.replaceName(val.name)
			val.maker = ProductsClass.replaceMaker(val.maker)
			val['update_at'] = now
		}
	}
	/**
	 * 修正
	 */
	async function edit(){
		for(const val of data){
			val.name = ProductsClass.replaceName(val.name)
			val.maker = ProductsClass.replaceMaker(val.maker)
		}
	}
	/**
	 * ダウンロード
	 */
	async function download(){
		await downloadCsv(data,'整形データ')
	}
</script>
<article>
<button onclick={async ()=>{await upload()}}>アップロード</button>
<button onclick={()=>{isMakerNull=!isMakerNull}}>メーカー空白</button>
<button onclick={async ()=>{await edit()}}>修正</button>
<button onclick={async ()=>{await download()}}>ダウンロード</button>
<div>
			<Input type="datalist" exclass="f1" list={ProductsClass.makerList} />
</div>
<h3>一覧</h3>
<table>
	<thead>
		<tr>
			<th>JANコード</th>
			<th style="width:40em;">名前</th>
			<th style="width:10em;">メーカー</th>
			<th>価格</th>
			<th>税込</th>
			<th>数量</th>
			<th>id</th>
		</tr>
	</thead>
	<tbody>
		{#each data as val,idx}
		{#if !isMakerNull || (isMakerNull&&data[idx].maker=='不明')}
		<tr>
			<td>
				<input type="text" bind:value={data[idx].jancode}>
			</td>
			<td class="break-word">
				<input type="text" bind:value={data[idx].name}>
			</td>
			<td>
				<input type="text" bind:value={data[idx].maker}>
			</td>
			<td>{val.price}</td>
			<td>{val.taxprice}</td>
			<td>{val.quantity}</td>
			<td>{val.id}</td>
		</tr>
		{/if}
	{/each}
	</tbody>
</table>
</article>
<style>
</style>