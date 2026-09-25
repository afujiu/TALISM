<!-------------------------------
	入庫処理
--------------------------------->
<script>
	import { onMount, onDestroy } from 'svelte'
	import { account,ui } from '$lib/store'
	import Input from '$comp/Input.svelte'
	import Fab from '$comp/Fab.svelte'
	import Loading from '$comp/Loading.svelte'
	import Ocr from '$comp/Ocr.svelte'
	import Icon from '$comp/Icon.svelte'
	import Format from '$comp/Format.svelte'

	let isLoading = $state(true)
	let isOcr = $state(false)
	let mode = $state(0)
	let ocrStructType=$state(0)
	// 履歴データ
	/**
	 * 履歴データ
	 * value:{count:1,state:"未確認,確認中,確認済,不一致",list:[{deliverySource,page,no,jancode,name,price,taxprice,quarity}]}
	 */
	const commonData = $state(
		{
			commonPage:0,
			isOpen:false,
			totalCount:0,
			list:[],
			get:async()=>{
				commonData.list = []
				const where ="type='orderList'"
				const result = await $account.getDb('common',{select:'id,created_at,overview',where:where,orderBy:[{column:'created_at',asc:false}],fromIndex:(commonData.commonPage)*MAX_ONE_PAGE_ROW,count:MAX_ONE_PAGE_ROW})
				if(result.ok){
					const countResult = await $account.getDbCount("common",{where:where})
					if(countResult.ok){
						commonData.totalCount = countResult.data
					}
					for(let data of result.data){
						commonData.list.push({
							id:data.id,
							created_at:data.created_at,
							deliverySource:data.overview.deliverySource,
							count:data.overview.count,
							state:data.overview.state,
						})
					}
				}
			},
			// 納品書のデータ初期化
			initOrder:()=>{
				commonData.selectedId=null
				commonData.oneOrderList=[]
				commonData.orderPage=1
			},
			// 納品書データを選択する
			selectOrder:async(id)=>{
				const result = await $account.getDb('common',{
					select:'id,created_at,overview,detail',
					where:`id='${id}'`}) 
				if(result.ok){
					commonData.selectedId=id
					commonData.oneOrderList=[...result.data[0].detail.list]
					commonData.orderPage=1
					mode=1
				}else{
					commonData.selectedId=null
					commonData.oneOrderList=[]
					mode=0
				}				
			},
			orderPage:1,
			selectedId:null,
			oneOrderList:[],
			//OCRからデータ追加
			addOrderList:(ocrList)=>{
				const deliverySource = OCR_STRUCT[ocrStructType].name
				const page = commonData.orderPage
				const orderList = ocrList.map((data, index) => ({
					deliverySource,
					page,
					no:index + 1,
					jancode:data.jancode,
					name:'',
					price:data.price,
					taxprice:Math.floor(data.price * 1.1),
					quantity:data.quantity,
				}))
				const firstIndex = commonData.oneOrderList.findIndex((data) =>
					data.deliverySource === deliverySource && data.page === page
				)
				if(firstIndex === -1){
					commonData.oneOrderList.push(...orderList)
				}else{
					const insertIndex = commonData.oneOrderList
						.slice(0, firstIndex)
						.filter((data) => data.deliverySource !== deliverySource || data.page !== page)
						.length
					const remaining = commonData.oneOrderList.filter((data) =>
						data.deliverySource !== deliverySource || data.page !== page
					)
					remaining.splice(insertIndex, 0, ...orderList)
					commonData.oneOrderList = remaining
				}
				commonData.orderPage++
			}
		})

	const MAX_ONE_PAGE_ROW=20

	/*******************
	 * argument */
	// 納品書レイアウト
	const OCR_STRUCT= $state([{name:'ブンカ',struct:[
				{id:'price_1',px:21,py:0,pw:20,ph:(100/12)/1.5},
				{id:'price_2',px:21,py:(100/12)*1,pw:20,ph:(100/12)/1.5},
				{id:'price_3',px:21,py:(100/12)*2,pw:20,ph:(100/12)/1.5},
				{id:'price_4',px:21,py:(100/12)*3,pw:20,ph:(100/12)/1.5},
				{id:'price_5',px:21,py:(100/12)*4,pw:20,ph:(100/12)/1.5},
				{id:'price_6',px:21,py:(100/12)*5,pw:20,ph:(100/12)/1.5},
				{id:'price_7',px:21,py:(100/12)*6,pw:20,ph:(100/12)/1.5},
				{id:'price_8',px:21,py:(100/12)*7,pw:20,ph:(100/12)/1.5},
				{id:'price_9',px:21,py:(100/12)*8,pw:20,ph:(100/12)/1.5},
				{id:'price_10',px:21,py:(100/12)*9,pw:20,ph:(100/12)/1.5},
				{id:'price_11',px:21,py:(100/12)*10,pw:20,ph:(100/12)/1.5},
				{id:'price_12',px:21,py:(100/12)*11,pw:20,ph:(100/12)/1.5},
				{id:'jancode_1',px:45,py:0,pw:38,ph:(100/12)/1.5},
				{id:'jancode_2',px:45,py:(100/12)*1,pw:38,ph:(100/12)/1.5},
				{id:'jancode_3',px:45,py:(100/12)*2,pw:38,ph:(100/12)/1.5},
				{id:'jancode_4',px:45,py:(100/12)*3,pw:38,ph:(100/12)/1.5},
				{id:'jancode_5',px:45,py:(100/12)*4,pw:38,ph:(100/12)/1.5},
				{id:'jancode_6',px:45,py:(100/12)*5,pw:38,ph:(100/12)/1.5},
				{id:'jancode_7',px:45,py:(100/12)*6,pw:38,ph:(100/12)/1.5},
				{id:'jancode_8',px:45,py:(100/12)*7,pw:38,ph:(100/12)/1.5},
				{id:'jancode_9',px:45,py:(100/12)*8,pw:38,ph:(100/12)/1.5},
				{id:'jancode_10',px:45,py:(100/12)*9,pw:38,ph:(100/12)/1.5},
				{id:'jancode_11',px:45,py:(100/12)*10,pw:38,ph:(100/12)/1.5},
				{id:'jancode_12',px:45,py:(100/12)*11,pw:38,ph:(100/12)/1.5},
				{id:'quantity_1',px:85,py:0,pw:14,ph:(100/12)},
				{id:'quantity_2',px:85,py:(100/12)*1,pw:14,ph:(100/12)},
				{id:'quantity_3',px:85,py:(100/12)*2,pw:14,ph:(100/12)},
				{id:'quantity_4',px:85,py:(100/12)*3,pw:14,ph:(100/12)},
				{id:'quantity_5',px:85,py:(100/12)*4,pw:14,ph:(100/12)},
				{id:'quantity_6',px:85,py:(100/12)*5,pw:14,ph:(100/12)},
				{id:'quantity_7',px:85,py:(100/12)*6,pw:14,ph:(100/12)},
				{id:'quantity_8',px:85,py:(100/12)*7,pw:14,ph:(100/12)},
				{id:'quantity_9',px:85,py:(100/12)*8,pw:14,ph:(100/12)},
				{id:'quantity_10',px:85,py:(100/12)*9,pw:14,ph:(100/12)},
				{id:'quantity_11',px:85,py:(100/12)*10,pw:14,ph:(100/12)},
				{id:'quantity_12',px:85,py:(100/12)*11,pw:14,ph:(100/12)},
			]},
			{name:'ハピネット',struct:[
				{id:'jancode_1',px:0,py:0,pw:20,ph:(100/6)},
				{id:'jancode_2',px:0,py:(100/6)*1,pw:20,ph:(100/6)},
				{id:'jancode_3',px:0,py:(100/6)*2,pw:20,ph:(100/6)},
				{id:'jancode_4',px:0,py:(100/6)*3,pw:20,ph:(100/6)},
				{id:'jancode_5',px:0,py:(100/6)*4,pw:20,ph:(100/6)},
				{id:'jancode_6',px:0,py:(100/6)*5,pw:20,ph:(100/6)},
				{id:'quantity_1',px:43,py:0,pw:4,ph:(100/6)},
				{id:'quantity_2',px:43,py:(100/6)*1,pw:4,ph:(100/6)},
				{id:'quantity_3',px:43,py:(100/6)*2,pw:4,ph:(100/6)},
				{id:'quantity_4',px:43,py:(100/6)*3,pw:4,ph:(100/6)},
				{id:'quantity_5',px:43,py:(100/6)*4,pw:4,ph:(100/6)},
				{id:'quantity_6',px:43,py:(100/6)*5,pw:4,ph:(100/6)},
				{id:'price_1',px:92,py:0,pw:8,ph:(100/6)},
				{id:'price_2',px:92,py:(100/6)*1,pw:8,ph:(100/6)},
				{id:'price_3',px:92,py:(100/6)*2,pw:8,ph:(100/6)},
				{id:'price_4',px:92,py:(100/6)*3,pw:8,ph:(100/6)},
				{id:'price_5',px:92,py:(100/6)*4,pw:8,ph:(100/6)},
				{id:'price_6',px:92,py:(100/6)*5,pw:8,ph:(100/6)},
			]},
			{name:'名古屋ガンショップ',struct:[]}
		])

	onMount(async () => {
		mode=0
		isLoading=false
		await getCommonList()
	})

	/**
	 * 履歴一覧データ取得
	 */
	async function getCommonList(){
		await commonData.get()
	}

	/**
	 * 登録
	 */
	async function confirm(){
		if(window.confirm("更新しますか")==false){
			return
		}
		$ui.addNotification(`${$ui.selectedMenuName} 中古情報の更新`,async()=>{
			isLoading=true
			const list = commonData.oneOrderList
			if(commonData.selectedId==null){
				//新規登録
				$account.insertDb('common',{
					type:'orderList',
					overview:{
						count: list.length,
						state: '確認中'
					},
					detail:{
						list: list,
					}
				})
			}else{
				//修正
				let state='確認中'
				const oneOrder = commonData.list.find(v=>v.id==commonData.selectedId)
				if(oneOrder!=undefined){
					state = oneOrder.state
				}
				$account.upsertDb('common',{
					id:commonData.selectedId,
					type:'orderList',
					detail:{
						list: list,
					},
					overview:{
						count: list.length,
						state: state,
					}
				},'id')
			}
			setTimeout(async() => {
				await commonData.get()
				mode=0
				isLoading=false
			}, 2000)
			
			return {status:true,message:'更新完了'}
		})
	}
</script>
	<Loading {isLoading}>
	<article>
		<!--履歴一覧-->
		{#if mode==0}
		<div>
			履歴一覧
			<Loading isLoading={commonData.list.length==0}>
			<table class="full-width">
				<thead class="sticky">
					<tr>
						<th style="width:12em;">日時</th>
						<th style="width:5em;">行数</th>
						<th style="width:5em;">状況</th>
						<th style="width:3em;">更新</th>
					</tr>
				</thead>
				<tbody>
				{#each commonData.list as val}
					<tr>
						<td class="align-center">
							<Format type="date-time" value={val.created_at}></Format>
						</td>
						<td class="align-center"><Format type="number" value={val.count}></Format>行</td>
						<td class="align-center">{val.state}</td>
						<td><button class="btn confirm-btn" onclick={async()=>{await commonData.selectOrder(val.id)}}><Icon value="edit"></Icon></button></td>
					</tr>
				{/each}
				</tbody>
			</table>
			</Loading>
		</div>
		{:else if mode==1}
		<!--新規登録-->
		<div>
			納品書登録
			<table class="full-width">
				<thead class="sticky">
					<tr>
						<th style="width:6em;">納品元</th>
						<th style="width:3em;">ページ</th>
						<th style="width:3em;">No</th>
						<th style="width:8em;">JANコード</th>
						<th>名前</th>
						<th style="width:4em;">単価</th>
						<th style="width:4em;">税込</th>
						<th style="width:3em;">数量</th>
					</tr>
				</thead>
				<tbody>
				{#each commonData.oneOrderList as val}
					<tr>
						<td>{val.deliverySource}</td>
						<td>{val.page}</td>
						<td>{val.no}</td>
						<td><Input type="number" bind:value={val.jancode}/></td>
						<td><Input type="text"  bind:value={val.name}/></td>
						<td><Input type="number" bind:value={val.price}/></td>
						<td><Input type="number" bind:value={val.taxprice}/></td>
						<td><Input type="number" bind:value={val.quantity}/></td>
					</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{/if}

		<!--OCR-->
		<Ocr 
			title="納品書OCR[{OCR_STRUCT[ocrStructType].name}]"
			bind:isPopup={isOcr}
			struct={OCR_STRUCT[ocrStructType].struct}
			on:extraction={(e)=>{ commonData.addOrderList(e.detail)}}
			></Ocr>
		<!--FAB-->
		<Fab>
		{#if mode==0}
		<!--履歴一覧-->
		<span class="f1">
				<button class="btn"
					disabled={0>=commonData.commonPage}
					onclick={async()=>{
						if(0<commonData.commonPage){
							commonData.commonPage--
							await commonData.get()
						}
					}}
				><Icon value="arrow_back_ios"></Icon></button>
			</span>
			<!-- 進む-->
			<span class="f1">
				<button class="btn" 
					disabled={commonData.totalCount<(MAX_ONE_PAGE_ROW*(commonData.commonPage+1))}
					onclick={async()=>{
						commonData.commonPage++
						await commonData.get()
					}}
				><Icon value="arrow_forward_ios"></Icon></button>
			</span>
			<!--ページ数　件数-->
			<span class="f2 align-center" style="background:var(--main1);">
				<div>{commonData.commonPage+1}/{Math.ceil(commonData.totalCount/MAX_ONE_PAGE_ROW)}</div>
				<div><Format type="number" value={commonData.totalCount}></Format>件</div>
			</span>
			<span class="f1"><button class="btn confirm-btn" onclick={()=>{commonData.initOrder();mode=1;}}>新規登録</button></span>
		{:else if mode==1}
		<!--登録-->
			<span class="f1">
				<button class="btn reset-btn" onclick={()=>{mode=0}}>履歴一覧</button>
			</span>
			<span class="f1">
				<Input
					type="select"
					list={OCR_STRUCT.map((item, index) => ({label: item.name, value: index}))}
					bind:value={ocrStructType}
				></Input>
			</span>
			<span class="f1">
				<Input type="number" bind:value={commonData.orderPage} min=1 max=100 step=1/>
			</span>
			<span class="f1">
				<button class="btn" onclick={()=>{isOcr=true}}>納品書スキャン</button>
			</span>
			<span class="f1">
				<button class="btn confirm-btn" onclick={async()=>{await confirm()}}>登録</button>
			</span>
		{/if}
		</Fab>
	</article>
	</Loading>
<style>
</style>