<!-- 在庫一覧-->
<script>
  import { onMount, untrack } from "svelte"
  import { updated } from "$app/state"
  import { account, ui } from "$lib/store"
  import { piSound } from "$lib/Sound.js"
  import { nowDateYMD } from "$lib/Date.js"
  import { uploadCsvConvertJson,uploadJson,downloadCsv } from "$lib/Upload.js"
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
	const MAX_ONE_PAGE_ROW =$state(1000)
	let stockList = $state([])
	let searchData=$state({
		maker:'',
		category:'',
		name:'',
		page:1,
	})
  /*******************
   * funcrion
   */

  onMount(async () => {
		isLoading = false
  })
	/**
	 * メタ情報を修正
	 */
	async function editMetaData(){
		let allProductList=[]
		const result = await $account.getLargeListDb('products')
		if(result.ok){
			allProductList = result.data
		}
		for(const i in allProductList){
			const val = allProductList[i]
			if(val.meta.makeshopCode!=null){
				val.meta['makeshop'] = {
					code:val.meta.makeshopCode,
					image:'登録済み',
					description:'',
					isShow:true,
				}
				delete val.meta['makeshopCode']
				delete val.meta['makeshopQuantity']
			}else{
				val.meta['makeshop'] = {
					code:null,
					image:null,
					description:null,
					isShow:false,
				}
			}
		}
		console.log(allProductList)
		await $account.upsertDb('products',allProductList,'jancode')
		alert('更新')
	}
	/**
	 * 検索
	 */
	async function search(){
		let where = ''
		stockList=[]
		if(searchData.maker!=''){
			where+=`maker like '%${searchData.maker}%'`
		}
		if(searchData.category!=''){
			if(where!='')where +=' and '
			where+= `category like '%${searchData.category}%'`
		}
		if(searchData.name!=''){
			if(where!='')where +=' and '
			where+= `name like '%${searchData.name}%'`
		}
		const result = await $account.getDb("products",{where:where,orderBy:'category,seriescode',fromIndex:(searchData.page-1)*MAX_ONE_PAGE_ROW,count:MAX_ONE_PAGE_ROW})
		if(result.ok){
			stockList = result.data
		}
	}
	/**
	 * 削除
	 * stockList配列から削除するのと$accountからの削除
	*/
	async function delVal(i,val){
		if (!val?.jancode) {
			window.alert('JANコードがないため削除できません')
			return
		}
		if (!window.confirm(`${val.name} を削除しますか？`)) {
			return
		}
		const result = await $account.deleteDb('products', {jancode:val.jancode})
		if (!result.ok) {
			window.alert(`削除に失敗しました: ${result.message}`)
			return
		}
		stockList.splice(i, 1)
	}

	/**
	 * 更新
	 */
	async function upsert(){
		await $account.upsertDb('products',stockList,'jancode')
		alert('更新')
	}
	/**
	 * カテゴリーにMM or MMVをつける
	 */
	function editCategoryAll(){
		for(let i in stockList){
			const val = stockList[i]
			if (typeof val.name === 'string') {
				val.name = val.name.trimStart()
			}
		}
	}

	/**
	 * メイクショップ用のダウンロード
	 */
	async function downalodMakeshop(){
		const downloadList=[]
		for(const val of stockList){
			if(val.meta.makeshopCode==null){
				continue
			}
			const quantity = val.quantity!=null?val.quantity:0
			let isShow = false
			//数量がある場合はtrue
			if(quantity>0){
				isShow = true
			}
			// 新規は強制非表示
			let makeshopCode = ''
			if(val.meta.makeshopCode!=null){
				makeshopCode = val.meta.maekshop.code
			}else{
				isShow = false
			}
			
			downloadList.push({
				selectCode:0,
				makeshopCode:makeshopCode,
				originalCode:val.jancode,
				jancode:val.jancode,
				name:val.name,
				category:val.category,
				price:val.price,
				showPrice:val.price,
				quantity:quantity,
				maker:val.maker,
				isShow:isShow?'Y':'N'
			})
		}
		await downloadCsv(downloadList,'makesopUpload',
			{
				replaceHeader:[
				{'selectCode':'商品特定コード指定'},
				{'makeshopCode':'システム商品コード'},
				{'originalCode':'独自商品コード'},
				{'jancode':'JANコード'},
				{'name':'商品名'},
				{'category':'カテゴリーパス'},
				{'price':'定価'},
				{'showPrice':'販売価格'},
				{'quantity':'数量'},
				{'maker':'製造元'},
				{'isShow':'商品表示可否'},
			],encoding:'shift-jis'}
	)
	}

</script>
<Loading {isLoading}>
	<div class="sticky full-width bg-main1" style="z-index:200;">
		<div class="flex">
			<div class="f2">
				<Input type="datalist" list={ProductsClass.makerList} placeholder="製造元" bind:value={searchData.maker}/>
			</div>
			<div class="f2">
				<Input type="datalist" exclass="f1" list={ProductsClass.categoryList} placeholder="カテゴリー" bind:value={searchData.category}/>
			</div>
			<div class="f2">
				<Input type="text" exclass="full-width" placeholder="名前" bind:value={searchData.name}/>
			</div>
			<div class="f2">
			<input type="number" class="full-width" min=1 step=1 bind:value={searchData.page}
				onchange={async()=>{await search()}}
			/>
			</div>
			<div class="f1">
				<button class="full-width full-height"
					onclick={async ()=>{await search()}}
				>検索</button>
			</div>
		</div>
		<div class="flex">
			<div class="f1">
				{stockList.length}
			</div>
			<div class="f1">
				<button onclick={async ()=>{await editCategoryAll()}}>カテゴリー修正</button>
			</div>
			<div class="f1">
				<button onclick={async ()=>{await downalodMakeshop()}}>DL</button>
				<button onclick={async ()=>{await editMetaData()}}>makeshop修正</button>
				
			</div>
			<div class="f1">
				<button onclick={async ()=>{await upsert()}}>更新</button>
				
			</div>
		</div>
	</div>
	<table style="z-index:100;">
		<thead>
			<tr>
				<th style="width:4em;">コード</th>
				<th style="width:40em;">名前</th>
				<th style="width:4em;">定価</th>
				<th style="width:4em;">数量</th>
				<th style="width:20em;">JANコード</th>
				<th>ほか</th>
				<th>削除</th>
			</tr>
		</thead>
		<tbody>
		{#each stockList as val,i}
			<tr>
				<td>
					<Input type="text" exclass="full-width" bind:value={val.seriescode}/>
				</td>
				<td><Input type="text" exclass="full-width" bind:value={val.name}/></td>
				<td>
				<div>
					<Input type="number" exclass="full-width full-height" bind:value={val.price} onchange={()=>{
						val.taxprice =  Math.floor(Number(val.price)*1.1)
					}}/>
				</div>
				<div>
					<Input type="number" exclass="full-width full-height" bind:value={val.taxprice} onchange={()=>{
						val.price = Math.ceil(Number(val.taxprice)/1.1)
					}}/>
				</div>
				</td>
				<td>
					<Input type="number" exclass="full-width full-height" bind:value={val.quantity}/>
				</td>
				<td>
					<div>
						{val.jancode}
					</div>
					<div>
						<Input type="datalist" list={ProductsClass.makerList} placeholder="製造元" bind:value={val.maker}/>
					</div>
					<div>
						<Input type="datalist" list={ProductsClass.categoryList} placeholder="カテゴリー" bind:value={val.category}/>
					</div>
				</td>
				<td>
					{val.meta.makeshopCode}
				</td>
				<td>
					<button class="full-width full-height" onclick={async()=>{await delVal(i,val)}}>削除</button>
				</td>
			</tr>
		{/each}
		</tbody>
	</table>
</Loading>

<style>
</style>
