<script>
  import { onMount, untrack } from "svelte"
  import { updated } from "$app/state"
  import { account, ui } from "$lib/store"
  import { piSound } from "$lib/Sound.js"
  import { nowDateYMD } from "$lib/Date.js"
	import { DexieClass } from '$lib/DexieClass.js'
  import { uploadCsvConvertJson,uploadJson } from "$lib/Upload.js"
	import Encoding from "encoding-japanese"
  import Loading from "$comp/Loading.svelte"
  import Icon from "$comp/Icon.svelte"
  import Fab from "$comp/Fab.svelte"
  import Format from "$comp/Format.svelte"
  import Input from "$comp/Input.svelte"
  import Popup from "$comp/Popup.svelte"
	import ContentsMenu from "$comp/ContentsMenu.svelte"
  import { ProductsClass } from "$lib/ProductsClass"

  /*******************
   * argument
   */
  let isLoading = $state(true)
	const stockEdit = new DexieClass('stockEdit')
	let maker = $state('')
	let category = $state('')
	const maxOnePage = $state(500)
	let page = $state(0)

	let listData = $state(
		{
			page:0,
			totalCount:0,
			list:[]}
	)

	const header =[
		'id',
		'created_at',
		'jancode',
		'seriescode',
		'name',
		'maker',
		'brand',
		'price',
		'taxprice',
		'meta',
		'seo',
		'quantity',
		'category',
		'update_at'
	]
  /*******************
   * funcrion
   */

  onMount(async () => {
    isLoading = true
		await stockEdit.init(header)
		await getDataDexie()
		isLoading = false
  })
	async function getDataDexie(){
		const data = await stockEdit.getAll()
		const existMaker = [...new Set(data.map(v => v.maker))]
		const makerList = new Set(ProductsClass.makerList)
		const missingMakers = existMaker.filter(maker => !makerList.has(maker))
		console.log(missingMakers)
		//missingMakersのメーカー名を既存のメーカー名に置換
		/***
		listData.list = data.filter((v)=>{
			return (v.seriescode==''||v.seriescode==null)&&(v.maker=='タミヤ')
			}
		)
		/***/
		for(let i in data){
			const val = data[i]
			if(val.meta['stocktaking']!=null){
				delete val.meta['stocktaking']
			}
		}
		/**/
		listData.list = data
	}
	/**
	 * DBからデータ取得
	 */
	async function getDataList(){
		listData.page=0
		listData.list=[]
    const result = await $account.getLargeListDb("products")
    if (result.ok) {
      listData.list = result.data
			await stockEdit.put(listData.list)
    }
	}
	async function update(val=null){
		if(val==null){
			await stockEdit.put(listData.list)
		}else{
			await stockEdit.put([val])
		}
		await getDataDexie()
	}
	async function updateDb(){
		$account.upsertDb('products',listData.list,'jancode')
		alert('fix')
	}

</script>

<Loading {isLoading}>
	<div class="flex sticky" style="background:rgba(150,150,150,1);z-index:999;">
		<div class="f1">{listData.list.length}</div>
		<button class="f1" onclick={async()=>{await updateDb()}}>更新</button>
		<div class="f1">
			<Input type="datalist" exclass="f1" list={ProductsClass.makerList} placeholder="製造元" bind:value={maker}/>
		</div>
		<div class="f1">
			<Input type="datalist" exclass="f1" list={ProductsClass.categoryList} placeholder="カテゴリー" bind:value={category}/>
		</div>
		<div class="f1">
			<input type="number" bind:value={page}>
		</div>
	</div>
	<table style="width:100%;">
		<thead>
			<tr>
				<th style="width:4em;">No</th>
				<th style="width:9em;">JANコード</th>
				<th colspan="2" style="width:30em;">名前</th>
				<th>数量など</th>
				<th></th>
				
			</tr>
		</thead>
		<tbody>
		<!-- -->
		{#each listData.list as val,idx}
			{#if (page*maxOnePage<idx && idx < (page+1)*maxOnePage)&&(val.maker == maker || maker=='')}
			<tr style="{idx%2==0?'background:rgba(200,200,200,1);':''}">
				<td rowspan=2>{idx+1}</td>
				<td>
					<input type="text" bind:value={val.seriescode} placeholder="シリーズコード">
				</td>
				<td colspan=2 ><input type="text" bind:value={val.name}><br>
				</td>
				<td>
					{val.price}
				</td>
				<td>
					{JSON.stringify(val.meta)}
				</td>
			</tr>
			<tr style="{idx%2==0?'background:rgba(200,200,200,1);':''}">
				<td>
					{val.jancode}
				</td>
				<td>
					<Input type="datalist" list={ProductsClass.makerList} placeholder="製造元" bind:value={val.maker}/>
				</td>
				<td>
					<Input type="datalist" list={ProductsClass.categoryList} placeholder="カテゴリー" bind:value={val.category}/>
				</td>
				<td>
					{val.quantity}
				</td>
				<td>
					{val.update_at}
				</td>

			</tr>
			{/if}
		{/each}
		<!---->
		</tbody>
	</table>
	
</Loading>

<style>
  .container {
    position: relative;
		width:100%;
  }
	.search-space{
		position:sticky;
		position:-webkit-sticky;
    inset:0 auto auto 0;
		z-index:900;
    width:100%;
		height:3em;
    min-width:100%;
    box-sizing:border-box;
		overflow-x:auto;
    overflow-y:hidden;
		background:white;
	}

  td {
    height: 2em;
    min-width: 5em;
		box-sizing: border-box;
  }

	/**アップロードポップアップ**/
	.upload-table{
		width:100%;
		height:10em;
		overflow:auto;
	}


	/*幅*/
	.stock-code{
		width:2em;
	}

	.stock-name{
		width:40em;
	}
	@media (max-width: 1024px) {
		.stock-code{
			width:0.8em;
		}
		.stock-name{
			width:25em;
		}
	}
	@media (max-width: 420px) {
		.stock-code{
			width:0.8em;
		}
		.stock-name{
			width:20em;
		}
	}
</style>
