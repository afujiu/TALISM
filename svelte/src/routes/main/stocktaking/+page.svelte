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
	import { speak } from '$lib/Sound.js'
	import Input from '$comp/Input.svelte'
	import Fab from '$comp/Fab.svelte'
	import Loading from '$comp/Loading.svelte'
	import Icon from '$comp/Icon.svelte'
	import Format from '$comp/Format.svelte'
    import Popup from '$lib/components/Popup.svelte'

  /*******************
   * argument
   */

	let focusElement =$state(null)
	
	let isLoading = $state(true)
	let products = new ProductsClass()
	let checkedList = $state([])
	const stockTakingDb = new DexieClass('stocktaking')
	let jancode = $state(null)
	let overview=$state({
		productsCount:0,
		realProductsCount:0,
		newProductsCount:0,
	})
	let selectedProducts = $state(null)

	onMount(async() => {
		await products.initDexie()
		await stockTakingDb.init(['jancode','name','price','taxprice','quantity'])
		overview.productsCount = await products.localProducts.count()
		overview.newProductsCount=0
		checkedList=await stockTakingDb.getAll()
		setRealCount()
		isLoading = false
		focus()
	})

	function setRealCount(){
		const count = checkedList.filter(v => v.quantity > 0).length
		overview.realProductsCount=count
	}
	/**
	 * 初期化
	 */
	async function init(){
		await stockTakingDb.deleteStore()
		const list = []
		const productsList = await products.localProducts.getAll()
		for(let val of productsList){
			list.push({
					jancode:val.jancode,
					name:val.name,
					price:val.price,
					taxprice:val.taxprice,
					quantity:0
				})
		}
		await stockTakingDb.put(list)
		overview.productsCount = await products.localProducts.count()
		overview.realProductsCount=0
		overview.newProductsCount=0
		checkedList=await stockTakingDb.getAll()
		focus()
	}

	/**
	 * 棚卸しデータを取得
	 * @param jancode
	 */
	async function getStockTakingData(jancode){
		const data = await stockTakingDb.getWhere([{mode:'query',key:'jancode',value:jancode}])
		if(data.length>0){
			return data[0]
		}else{
			return null
		}
	}
	/**
	 * バーコードスキャン
	 * 既存のDBにない場合は新規登録
	 */
	async function scanBarcode(){
		const start = performance.now()
		let existProducts={}
		if(jancode!=''){
			// ローカルデータからjancodeで名前、単価取得
			const lsProductList = await products.getProducts(jancode)
			if(lsProductList.length>0){
				existProducts = lsProductList[0]
			}else{
				// APIorDBから商品情報取得
				existProducts = await ProductsClass.getProductData(jancode)
			}
			// 棚卸しLSから既存jancode取得し、数量を追加
			let stockTakingData = await getStockTakingData(jancode)
			//新規棚卸し
			if(stockTakingData==null){
				const newData ={
					jancode:jancode,
					name:existProducts.name,
					price:existProducts.price,
					taxprice:existProducts.taxprice,
					quantity:1
				}
				stockTakingData = newData
				checkedList=[newData,...checkedList]
			}else{
				//数量追加
				const idx = checkedList.findIndex(v=>v.jancode==jancode)
				if(idx!=-1){
					checkedList[idx].quantity++
				}
				stockTakingData.quantity++
			}
			
			stockTakingDb.put([stockTakingData]).then(() => {
			});

			setRealCount()
		}
		jancode=''
		//フォーカスをid="barcodeCheck"に戻すinput?.focus();
		focusElement?.focus()
		console.log(`1: ${performance.now() - start} ms`)
	}
	function focus(){
		setTimeout(()=>{
			focusElement?.focus()
		},50)
	}

	/**
	 * 登録
	 */
	async function confirm(){
		if(window.confirm("更新しますか")==false){
			return
		}
		$ui.addNotification(`${$ui.selectedMenuName} 棚卸しの更新`,async()=>{
			return {status:true,message:'更新完了'}
		})
	}
</script>
	<Loading {isLoading}>
	<article>
		<input bind:this={focusElement} type="number" bind:value={jancode} onchange={async(e)=>{scanBarcode()}}>
		<!-- 概要データ-->
		<div class="flex">
			<span class="f1 align-center">既存商品数:<Format type="number" comma value={overview.productsCount}></Format></span>
			<span class="f1 align-center">商品実数:<Format type="number" comma value={overview.realProductsCount}></Format></span>
			<span class="f1 align-center">新商品数:<Format type="number" comma value={overview.newProductsCount}></Format></span>
		</div>
		<!-- スキャンしたデータ-->
		<div>
		
		</div>
		<div>
			<table class="full-width">
				<thead>
					<tr>
						<th style="width:8em;">JANコード</th>
						<th >名前</th>
						<th style="width:5em;">価格</th>
						<th style="width:3em;">数量</th>
					</tr>
				</thead>
				<tbody>
				{#each checkedList as item}
					{#if item.quantity>0}
						<tr>
							<td>{item.jancode}</td>
							<td class="break-word">{item.name}</td>
							<td style="cursor:pointer;" onclick={()=>{
								selectedProducts=item
								if(selectedProducts.price==0){
									selectedProducts.price=null
								}
								if(selectedProducts.taxprice==0){
									selectedProducts.taxprice=null
								}
							}}>
								<div><Format type="yen" value={item.price}></Format></div>
								<div><Format type="yen" value={item.taxprice}></Format></div>
							</td>
							<td>{item.quantity}</td>
						</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
		<Fab>
			<span class="f1">
				<button class="btn reset-btn" onclick={async()=>{await init()}}>初期化</button>
			</span>
			<span class="f1">
				<button class="btn confirm-btn" onclick={async()=>{await confirm()}}>登録</button>
			</span>
		</Fab>
	</article>
	</Loading>
	<Popup value={selectedProducts!=null}
		on:close={()=>{
			focus()
			selectedProducts=null
			}
		}
	>
		<span slot="title">価格修正</span>
		<div class="flex">
		<span class="f1">価格</span>
		<span class="f1">
			<Input type="number" bind:value={selectedProducts.price} on:change={()=>{selectedProducts.taxprice=Math.floor(selectedProducts.price * 1.1)}}></Input>
		</span>
		<span class="f1">税込</span>
		<span class="f1"><Format type="number" comma value={selectedProducts.taxprice}></Format></span>
		</div>
	</Popup>
<style>
</style>