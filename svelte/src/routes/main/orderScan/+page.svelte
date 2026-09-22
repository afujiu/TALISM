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
    import Icon from '$lib/components/Icon.svelte'

	let isLoading = $state(true)
	let isOcr = $state(false)
	let page = $state(0)
	let ocrStructType=$state(0)


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
		page=0
		isLoading=false
	})
</script>
	<Loading {isLoading}>
	<article>
		<!--ログ一覧-->
		{#if page==0}
		<div>
			ログ一覧
			<table class="full-width">
				<thead>
					<tr>
						<th>日時</th>
						<th>納品元</th>
						<th>件数</th>
						<th>状況</th>
						<th>更新</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td><button class="btn icon"><Icon value="edit"></Icon></button></td>
					</tr>
				</tbody>
			</table>
		</div>
		{:else if page==1}
		<!--新規登録-->
		<div>
			新規登録
		</div>
		{/if}

		<!--OCR-->
		<Ocr 
			title="納品書OCR[{OCR_STRUCT[ocrStructType].name}]"
			bind:isPopup={isOcr}
			struct={OCR_STRUCT[ocrStructType].struct}
			on:extraction={(e)=>{console.log(e.detail)}}
			></Ocr>
		<!--FAB-->
		<Fab>
		{#if page==0}
		<!--ログ一覧-->
			<span class="f1"><button class="btn">検索</button></span>
			<span class="f1"><button class="btn confirm-btn" onclick={()=>{page=1}}>新規登録</button></span>
		{:else if page==1}
		<!--新規登録-->
			<span class="f1">
				<button class="btn reset-btn" onclick={()=>{page=0}}>ログ一覧</button>
			</span>
			<span class="f1">
				<Input
					type="select"
					list={OCR_STRUCT.map((item, index) => ({label: item.name, value: index}))}
					bind:value={ocrStructType}
				></Input>
			</span>
			<span class="f1">
				<button class="btn" onclick={()=>{isOcr=true}}>納品書スキャン</button>
			</span>
			<span class="f1">
				<button class="btn confirm-btn">登録</button>
			</span>
		{/if}
		</Fab>
	</article>
	</Loading>
<style>
</style>