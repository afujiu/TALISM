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
	let jancode = $state(null)
	let productList = $state([])
	const overview=$state({
		productCount:0,
		realProductCount:0,
		newProductCount:0,
	})
	let selectedProduct = $state(null)
	const stockTakingDb = new DexieClass('stocktaking')


	onMount(async() => {
		await stockTakingDb.init(['jancode','name','price','taxprice','quantity'])
		productList = await stockTakingDb.getAll()
		await setOverview()
		isLoading = false
		focus()
	})

	async function setOverview(){
		overview.productCount=productList.length
		const realProductCount = productList.filter(v=>v.quantity!=0).length
		overview.realProductCount=realProductCount
		overview.newProductCount=0
	}

	/**
	 * データ変更(dexie.jsに更新)
	*/
	async function changeProducts(val){
		productList = [val, ...productList.filter((item) => item.jancode !== val.jancode)]
		await stockTakingDb.put(productList)
		await setOverview()
	}
	/**
	 * 初期化
	 * productsのすべての商品情報の数量=0のデータをローカルに保存
	 */
	async function init(){
		await stockTakingDb.deleteStore()
		const list=[]
		const getProductList = await ProductsClass.getProductList()
		for(const val of getProductList){
			list.push({
				jancode:val.jancode,
				name:val.name,
				price:val.price,
				taxprice:val.taxprice,
				quantity:0,
				id:val.id
			})
		}
		await stockTakingDb.put(list)
		productList = await stockTakingDb.getAll()
		await setOverview()
		focus()
	}


	/**
	 * バーコードスキャン
	 * 既存のDBにない場合は新規登録
	 */
	async function scanBarcode(){
		selectedProduct=null
		if(jancode!=''){
			selectedProduct = productList.find(v=>v.jancode==jancode)
			if(selectedProduct!=undefined){
				selectedProduct.quantity++
				await speak(`${selectedProduct.price}円。${selectedProduct.price}円`)
			}else{
				//既存商品マスタにない場合は、APIから取得して新規項目化
				const result = await ProductsClass.getApiJancode(jancode)
				if(result.length>0){
					const newProduct = result[0]
					selectedProduct = {
						jancode:jancode,
						name:newProduct.name,
						price:Number(newProduct.price),
						taxprice:Math.floor(Number(newProduct.price)*1.1),
						quantity:1,
						id:null
					}
					await speak(`新商品 ${newProduct.price}円。新商品 ${newProduct.price}円`)
					productList.unshift(selectedProduct)
				}
			}
		}
		focus()
		await setOverview()
	}

	function focus(){
		jancode=''
		setTimeout(()=>{
			focusElement?.focus()
		},10)
	}

	/**
	 * 登録
	 */
	async function confirm(){
		if(window.confirm("更新しますか")==false){
			return
		}
		$ui.addNotification(`${$ui.selectedMenuName} 棚卸しの更新`,async()=>{
			const fixList = await stockTakingDb.getAll()
			let updateLst=[]
			for(let val of fixList){
				updateLst.push({
					jancode:val.jancode,
					name:val.name,
					price:val.price,
					taxprice:val.taxprice,
					quantity:val.quantity
				})
			}
			$account.upsertDb('products',updateLst,'jancode')
			return {status:true,message:'更新完了'}
		})
	}

</script>
	<Loading {isLoading}>
	<article>
		<div class="top-block">
			<input bind:this={focusElement} type="number" bind:value={jancode} placeholder="バーコード" onchange={async(e)=>{scanBarcode()}}>
			<!-- 概要データ-->
			<div class="flex">
				<span class="f1 align-center">既存商品数:<Format type="number" comma value={overview.productCount}></Format></span>
				<span class="f1 align-center">商品実数:<Format type="number" comma value={overview.realProductCount}></Format></span>
				<span class="f1 align-center">新商品数:<Format type="number" comma value={overview.newProductCount}></Format></span>
			</div>
			<!-- スキャンしたデータ-->
			<div class="scan-data-block">
			{#if selectedProduct!=null}
				<div class="flex">
					<span class="f1">JANコード</span>
					<span class="f6">{selectedProduct.jancode}</span>
				</div>

				<div class="flex">
						<span class="f1">品名</span>
						<span class="f6"><Input type="text" bind:value={selectedProduct.name}/></span>
				</div>

				<div class="flex">
					<span class="f1">価格</span>
					<span class="f6">
						<Input type="number" bind:value={selectedProduct.price} on:change={async()=>{
						selectedProduct.taxprice = Math.floor(Number(selectedProduct.price)*1.1)
						await changeProducts(selectedProduct)
					}}/></span>
				</div>
				<div class="flex">
					<span class="f1">税込</span>
					<span class="f6"><Input type="number" bind:value={selectedProduct.taxprice} on:change={async()=>{
						selectedProduct.price = Math.ceil(Number(selectedProduct.taxprice)/1.1)
						await changeProducts(selectedProduct)
					}}/></span>
				</div>
				<div class="flex">
					<span class="f1">数量</span>
					<span class="f6"><Input type="number" bind:value={selectedProduct.quantity} on:change={async()=>{
						await changeProducts(selectedProduct)}}/>
					</span>
			</div>
				{/if}
			</div>
		</div>
		<div class="bottom-block">
			<table class="full-width">
				<thead class="sticky">
					<tr>
						<th>JANコード<br>名前</th>
						<th style="width:4em;">価格</th>
						<th style="width:3em;">数量</th>
					</tr>
				</thead>
				<tbody>
				{#each productList.slice(0, 100) as val}
					<tr>
						<td>
							<div>{val.jancode}</div>
							<div class="break-word">{val.name}</div>
						</td>
						<td>
							<div>
								<Input type="number" isStep={false} bind:value={val.price}/>
							</div>
							<div>
								<Format type="yen" value={val.taxprice}></Format>
							</div>
						</td>
						<td>
							<Input type="number" isStep={false} bind:value={val.quantity} on:change={async()=>{await changeProducts(val)}}/>
						</td>
					</tr>
				{/each}
				</tbody>
			</table>
		</div>
		<Fab>
			<span class="f1"><button class="btn" onclick={async()=>{await init()}}>初期化</button></span>
			<span class="f1"><button class="btn confirm-btn" onclick={async ()=>{await confirm()}}>登録</button></span>
		</Fab>
	</article>
	</Loading>
<style>
	article{
		overflow:hidden;
	}
	.top-block{
		width:100%;
		height:30%;
		position:relative;
	}
	.bottom-block{
		width:100%;
		height:60%;
		overflow:auto;
	}
	.scan-data-block{
	}
</style>