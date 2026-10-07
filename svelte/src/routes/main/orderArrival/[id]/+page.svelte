<!-------------------------------
	入荷
--------------------------------->
<script>
	import { onMount, onDestroy } from 'svelte'
	import { account,ui } from '$lib/store'
  import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { ProductsClass } from '$lib/ProductsClass.js'
	import { speak } from '$lib/Sound.js'
	import Input from '$comp/Input.svelte'
	import Fab from '$comp/Fab.svelte'
	import Loading from '$comp/Loading.svelte'
	import Ocr from '$comp/Ocr.svelte'
	import Icon from '$comp/Icon.svelte'
	import Format from '$comp/Format.svelte'

  /*******************
   * argument
   */

	let focusElement =$state(null)
	let isLoading = $state(true)
	let selectedId = $state(null)
	let jancode = $state(null)
	let selectedOrder = $state(null)

	let orderData = $state({
		isOpen:false,
		commons:null,
		list:[],
		get:async(id)=>{
			orderData.list=[]
			const result = await $account.getDb('common',{where:`id='${id}' and type='orderList'`})
			if(result.ok){
				orderData.commons = result.data[0]
				const list = orderData.commons.detail.productsList
				orderData.list = list
				for(let i in orderData.list){
					if(orderData.list[i]['realQuantity']==null){
						orderData.list[i]['realQuantity']=0
					}
				}
			}
		}
	})
	onMount(async() => {
		selectedId = page.params.id
		await orderData.get(selectedId)
		isLoading=false
		setTimeout(()=>{
			focusElement?.focus()
		},50)
	})
	/**
	 * バーコードスキャン
	 */
	function scanBarcode(){
		if(jancode!=''){
			const idx = orderData.list.findIndex(v=>v.jancode == jancode)
			if(idx!=-1){
				selectedOrder = orderData.list[idx]
				selectedOrder.realQuantity++
				speak(`${selectedOrder.taxprice}円。${selectedOrder.taxprice}円。`)
			}
		}
		jancode=''
		//フォーカスをid="barcodeCheck"に戻すinput?.focus();
		focusElement?.focus()
	}

	/**
	 * 納品書情報の保存
	*/
	async function saveCommon(isComplate){
		const overview = orderData.commons.overview
		let checkedProductsCount=0
		for(const val of orderData.list){
			if(val.quantity == val.realQuantity){
				checkedProductsCount++
			}
		}
		overview.checkedProductsCount = checkedProductsCount
		if(overview.checkedProductsCount==overview.count){
			overview.state = '確認済'
		}else{
			overview.state = '確認中'
		}
		if(isComplate){
			overview.state = '在庫反映済'
		}
		$account.upsertDb('common',orderData.commons,'id')
	}
	/**
	 * 一時保存
	*/
	async function save(){
		if(window.confirm("一致字保存しますか")==false){
			return
		}
		$ui.addNotification(`${$ui.selectedMenuName} 検品情報の一致字保存`,async()=>{
			await saveCommon()
			return {status:true,message:'保存完了'}
		})
	}
	/**
	 * 登録
	 */
	async function confirm(){
		if(window.confirm("更新しますか")==false){
			return
		}
		$ui.addNotification(`${$ui.selectedMenuName} 在庫情報の更新`,async()=>{
			await saveCommon(true)
			await ProductsClass.updateProductsQuantity(orderData.list)
			await goto(`/main/orderArrival/`)
			return {status:true,message:'更新完了'}
		})
	}
</script>
	<Loading {isLoading}>
	<article>
		<div class="scan-block">
			<input bind:this={focusElement} type="number" placeholder="スキャン" bind:value={jancode} onchange={(e)=>{scanBarcode()}}>
			{#if selectedOrder!=null}
				<div>{selectedOrder.jancode}</div>
				<div>{selectedOrder.name}</div>
				<div class="flex">
					<div class="f1">単価：<Format type="yen" value={selectedOrder.price}/></div>
					<div class="f1">税込：<Format type="yen" value={selectedOrder.taxprice}/></div>
					<div class="f1">数量：<Format type="number" value={selectedOrder.quantity}/></div>
					<div class="f1">数量：<Format type="number" value={selectedOrder.realQuantity}/></div>
				</div>
			{/if}
		</div>
		<div class="table-block">
			<table class="full-width">
				<thead>
					<tr>
						<th>JANコード 名前</th>
						<th style="width:5em;">単価</th>
						<th style="width:5em;">数量</th>
					</tr>
				</thead>
				<tbody>
				{#each orderData.list as val}
					<tr class="{(val.realQuantity == val.quantity)?'checked-line':''} {selectedOrder?.jancode==val.jancode?'selected-line':''}">
						<td>
							<div>{val.jancode}</div>
							<div class="break-word">{val.name}</div>
						</td>
						<td class="align-right">
							<div><Format type="yen" value={val.price}/></div>
							<div><Format type="yen" value={val.taxprice}/></div>
						</td>
						<td class="align-right">
							<div><Format type="number" value={val.quantity}/></div>
							<div><Input type="number" min=0 step=1 bind:value={val.realQuantity}/></div>
						</td>
					</tr>
				{/each}
				</tbody>
			</table>
		</div>
		<Fab>
			<span class="f1">
				<button class="btn reset-btn" onclick={async()=>{await goto(`/main/orderArrival/`)}}>戻る</button>
			</span>
			<span class="f1">
				<button class="btn" onclick={async()=>{await save()}}>一時保存</button>
			</span>
			<span class="f1">
				<button class="btn confirm-btn" onclick={async()=>{await confirm()}}>確定</button>
			</span>
		</Fab>
	</article>
	</Loading>
<style>
	.checked-line{
		opacity:0.5;
		background:gray;
	}
	.selected-line{
		color:var(--confirm)
	}
	.scan-block{
		width:100%;
		height:20%;
	}
	.table-block{
		width:100%;
		height:80%;
		overflow:auto;
	}
</style>