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

	import Accordion from '$lib/components/Accordion.svelte'
  /*******************
   * argument
   */
	let beforeCsv = $state([])
	let afterCsv = $state([])
	let beforeMoreList = $state([])
	let beforeMoreQuantity = $state([])
	let afterMoreQuantity = $state([])
	let margeData=$state([])
	/**
	* 2つのcsvを取得して、差分をとる
	*/
	async function uploadBefore(){
		beforeCsv = await uploadCsvConvertJson()
	}
	async function uploadAfter(){
		afterCsv = await uploadCsvConvertJson()
		
		//1.jancodeで、beforeCsvにあってafterCsvにないデータを取得(引き継ぎ不良)
		const afterJancodeSet = new Set(
			afterCsv
				.map((item) => String(item.jancode ?? '').trim())
				.filter((jancode) => jancode !== '')
		)
		beforeMoreList = beforeCsv.filter((item) => {
			const jancode = String(item.jancode ?? '').trim()
			return jancode !== '' && !afterJancodeSet.has(jancode)
		})

		// 2.同じjancodeで過去データの方が数量が多いデータを取得
		const afterByJancode = new Map(
			afterCsv
				.map((item) => [String(item.jancode ?? '').trim(), item])
				.filter(([jancode]) => jancode !== '')
		)
		beforeMoreQuantity = beforeCsv.flatMap((item) => {
			const jancode = String(item.jancode ?? '').trim()
			const afterItem = afterByJancode.get(jancode)
			if (!jancode || !afterItem) return []

			const beforeQuantity = Number(item.quantity)
			const afterQuantity = Number(afterItem.quantity)
			if (
				!Number.isFinite(beforeQuantity) ||
				!Number.isFinite(afterQuantity) ||
				beforeQuantity <= afterQuantity
			) return []

			return [{...item, afterQuantity}]
		})

		// 3.同じjancodeで後発データの方が数量が多いデータを取得
		const beforeByJancode = new Map(
			beforeCsv
				.map((item) => [String(item.jancode ?? '').trim(), item])
				.filter(([jancode]) => jancode !== '')
		)
		afterMoreQuantity = afterCsv.flatMap((item) => {
			const jancode = String(item.jancode ?? '').trim()
			const beforeItem = beforeByJancode.get(jancode)
			if (!jancode || !beforeItem) return []

			const beforeQuantity = Number(beforeItem.quantity)
			const afterQuantity = Number(item.quantity)
			if (
				!Number.isFinite(beforeQuantity) ||
				!Number.isFinite(afterQuantity) ||
				afterQuantity <= beforeQuantity
			) return []

			return [{...item, beforeQuantity}]
		})

		//4.先と後をマージ(同じjancodeの場合は数量を加算)
		const mergedByJancode = new Map()
		const mergedList = []
		for (const item of [...beforeCsv, ...afterCsv]) {
			const jancode = String(item.jancode ?? '').trim()
			if (!jancode) {
				mergedList.push(item)
				continue
			}

			const existing = mergedByJancode.get(jancode)
			if (!existing) {
				mergedByJancode.set(jancode, {...item, jancode})
				continue
			}

			const quantity = Number(existing.quantity) + Number(item.quantity)
			mergedByJancode.set(jancode, {...existing, ...item, jancode, quantity})
		}
		margeData = [...mergedByJancode.values(), ...mergedList]
	}

	/**
	 * ダウンロード
	 */
	async function downloadMarge(){
		await downloadCsv(margeData,'マージ後データ')
	}
</script>
<article>
<button onclick={async ()=>{await uploadBefore()}}>元CSV</button><br>
<button onclick={async ()=>{await uploadAfter()}}>後CSV</button>
<button onclick={async ()=>{await downloadMarge()}}>マージデータをダウンロード</button>
<h3>過去データにのみ登録されている商品</h3>
<Accordion>
<table>
	<thead>
		<tr>
			<th>JANコード</th>
			<th>名前</th>
			<th>数量</th>
		</tr>
	</thead>
	<tbody>
	{#each beforeMoreList as val}
		<tr>
			<td>{val.jancode}</td>
			<td>{val.name}</td>
			<td>{val.quantity}</td>
		</tr>
	{/each}
	</tbody>
</table>
</Accordion>



	<h3>後発データの方が数量が多いデータ<span>{afterMoreQuantity.length}</span></h3>
	<Accordion>
<table>
	<thead>
		<tr>
			<th>JANコード</th>
			<th>名前</th>
			<th>過去数量</th>
				<th>後発数量</th>
		</tr>
	</thead>
	<tbody>
		{#each afterMoreQuantity as val}
		<tr>
			<td>{val.jancode}</td>
			<td>{val.name}</td>
				<td>{val.beforeQuantity}</td>
				<td>{val.quantity}</td>
		</tr>
	{/each}
	</tbody>
</table>
</Accordion>



<Accordion>
<h3>過去データの方が数量が多いデータ<span>{beforeMoreQuantity.length}</span></h3>
<table>
	<thead>
		<tr>
			<th>JANコード</th>
			<th>名前</th>
			<th>過去数量</th>
			<th>後数量</th>
		</tr>
	</thead>
	<tbody>
	{#each beforeMoreQuantity as val}
		<tr>
			<td>{val.jancode}</td>
			<td>{val.name}</td>
			<td>{val.quantity}</td>
			<td>{val.afterQuantity}</td>
		</tr>
	{/each}
	</tbody>
</table>
</Accordion>


<h3>元CSVと後CSVのマージ結果<span>{margeData.length}</span></h3>
<Accordion>
<table>
	<thead>
		<tr>
			<th>JANコード</th>
			<th>名前</th>
			<th>数量</th>
		</tr>
	</thead>
	<tbody>
	{#each margeData as val}
		<tr>
			<td>{val.jancode}</td>
			<td>{val.name}</td>
			<td>{val.quantity}</td>
		</tr>
	{/each}
	</tbody>
</table>
</Accordion>
</article>
<style>
</style>