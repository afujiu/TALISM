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
	let selectedProducts = $state(null)
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
		if(jancode!=''){
			let existProduct = productList.find(v=>v.jancode==jancode)
			if(existProduct!=undefined){
				existProduct.quantity++
			}else{
				//既存商品マスタにない場合は、APIから取得して新規項目化
				const result = await ProductsClass.getApiJancode(jancode)
				if(result.length>0){
					console.log(result)
					const newProduct = result[0]
					existProduct = {
						jancode:jancode,
						name:newProduct.name,
						price:Number(newProduct.price),
						taxprice:Math.floor(Number(newProduct.price)*1.1),
						quantity:1,
						id:null
					}
					productList.unshift(existProduct)
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
			return {status:true,message:'更新完了'}
		})
	}

</script>
	<Loading {isLoading}>
	<article>
		<div class="top-block">
			<input bind:this={focusElement} type="number" bind:value={jancode} onchange={async(e)=>{scanBarcode()}}>
			<!-- 概要データ-->
			<div class="flex">
				<span class="f1 align-center">既存商品数:<Format type="number" comma value={overview.productCount}></Format></span>
				<span class="f1 align-center">商品実数:<Format type="number" comma value={overview.realProductCount}></Format></span>
				<span class="f1 align-center">新商品数:<Format type="number" comma value={overview.newProductCount}></Format></span>
			</div>
			<!-- スキャンしたデータ-->
			<div>
			
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
			<span class="f1"><button class="btn confirm-btn">登録</button></span>
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
</style>