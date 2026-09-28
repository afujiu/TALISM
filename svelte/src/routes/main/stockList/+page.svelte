<script>
  import { onMount, untrack } from "svelte"
  import { updated } from "$app/state"
  import { account, ui } from "$lib/store"
  import { piSound } from "$lib/Sound.js"
  import { nowDateYMD } from "$lib/Date.js"
  import { uploadCsvConvertJson,uploadJson } from "$lib/Upload.js"
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
	let isStocklistOption = $state(false)
	let selectedNameEditor=$state(false)
	let beforeEditData=null

	const MAX_ONE_PAGE_ROW=200

	let listData = $state(
		{
			page:0,
			isOpen:false,
			where:{maker:'',category:'',name:''},
			totalCount:0,
			list:[]}
	)

	/** @type {{isOpen:boolean, list:Array<Record<string, any>>, makeshopList:Array<Record<string, any>>, differenceList:Array<Record<string, any>>, uploadFunc:()=>Promise<void>, uploadSave:()=>Promise<void>}} */
	let uploadData = $state({
		isOpen:false,
		list:[],
		makeshopList:[],
		differenceList:[],
		/**
		 * JSONファイルをアップロード
		*/
		uploadJson:async()=>{
			try{
				const resultJson = await uploadJson()
				const result = await $account.getDb('products')
				if(result.ok){
					const saveList=[]
					// 既存janコードがない分をupsert
					for(const val of resultJson){
						if(result.data.find(v=>v.jancode == val.jancode)==undefined){
							saveList.push({
								jancode:val.jancode,
								name:val.name,
								category:'',
								maker:val.brand,
								price:(val.price!='')?Number(val.price):null,
								taxprice:(val.taxprice!='')?Number(val.taxprice):null,
							})
						}
					}
					await $account.upsertDb('products',saveList,'jancode')
					listData.page=1
					await getDataList()
				}
			}catch(e){}
		},
		/**
		 * アップロード
		 */
		uploadFunc:async()=>{
			uploadData.list=[]
			uploadData.makeshopList=[]
			uploadData.differenceList=[]
   		const uploadList = await uploadCsvConvertJson([
				{'システム商品コード':'makeshopcode'},
				{'JANコード':'jancode'},
				{'商品名':'name'},
				{'カテゴリーパス':'category'},
				{'数量':'quantity'},
				{'製造元':'maker'},
			])
    	if (uploadList.length > 0) {
				uploadData.makeshopList = [...uploadList]
				
				const result = await $account.getDb('products')
				// DBデータを取得
				if(result.ok){
					uploadData.list = result.data
					// 実数データとmakeshopデータを比較
					for(const val of uploadData.list){
						const exist = uploadData.makeshopList.find(v=>v.jancode==val.jancode)
						if(exist){
							if(Number(exist.quantity)!=Number(val.quantity)){
								uploadData.differenceList.push({
									makeshopcode:exist.makeshopcode,
									jancode:val.jancode,
									seriescode:val.seriescode,
									name:val.name,
									quantity:val.quantity,
									makeshopQuantity:exist.quantity
								})
							}
						}
					}
				}
				uploadData.isOpen = true
				isStocklistOption=false
    	}
		},
		/**
		 * makeshopデータのアップロードを実行
		 * jancode,name,category,maker,meta:[makeshopCode:makeshopcode,makeshopQuantity:quantity]
		 * 既存のjancodeは更新しない
		 */
		uploadSave:async()=>{
			let saveList=[]
			for(let val of uploadData.makeshopList){
				saveList.push({
					jancode:val.jancode,
					meta:{makeshopCode:val.makeshopcode,makeshopQuantity:val.quantity},
				})
			}
			await $account.upsertDb('products',saveList,'jancode')
			listData.page=1
			await getDataList()
			uploadData.isOpen = false
		}
	})

  const categoryList = ProductsClass.categoryList

  const makerList = $state([
	"タミヤ",
	"LayLax",
	"ナインボール",
	"バンダイ",
	"東京マルイ",
	"F.FACTORY",
	"ハセガワ",
	"フジミ",
	"ファイアフライ",
	"フリーダム・アート",
	"KM企画",
	"ライラクス",
	"アオシマ",
	"イマイ",
	"不明",
	"SⅡS",
	"アリイ",
	"アローダイナミック",
	"アングス",
	"システマ",
	"キットボーイ",
	"エレメント",
	"ドラゴン",
	"ABCホビー",
	"アーテック",
	"accutact",
	"AFVクラブ",
	"AIM SPORTS",
	"Alan",
	"ANGEL",
	"BANDAI SPIRITS",
	"Bushnell",
	"C-MORE",
	"CAW",
	"ENCORE MODELS",
	"EOTech",
	"G&G",
	"G&P",
	"GFORCE",
	"GSIクレオス",
	"ガイアノーツ",
	"HMC",
	"HYUGA",
	"KASSNAR",
	"KSC",
	"LA-GUNSHOP",
	"LEAPERS",
	"LONEX",
	"NcSTAR",
	"NEOX",
	"NINEBALL",
	"NITRO.Vo",
	"NOVEL",
	"OKパーツ",
	"OPTION NO1",
	"ORGA",
	"PDI",
	"SHS",
	"Skirmish",
	"TASCO",
	"TOP",
	"UFC",
	"WA",
	"XCORTECH",
	"アカデミー",
	"イーグル",
	"イーグルフォース",
	"イーグルモデル",
	"イタレリ",
	"ウェーブ",
	"クライタック",
	"クラウン",
	"クラウンモデル",
	"グンゼ",
	"コスモ・エナジー",
	"サイトロンジャパン",
	"ジーフォース",
	"スウィート",
	"スプレッドワールド",
	"スモーキーズ",
	"セキトー",
	"ダイアモンドリング",
	"タスクフォース",
	"タミックス",
	"ディアブロ",
	"トミー",
	"ノーベルアームズ",
	"ハートフォード",
	"ハイテック",
	"パカ山クラフト",
	"パドック",
	"バトラークリーク",
	"ビッグアウト",
	"ピットロード",
	"ヒューガ",
	"ファースト",
	"ファーストファクトリー",
	"ファインモールド",
	"プロゲーマー",
	"プロテック",
	"ホビーマスター",
	"マルイ",
	"マルサン",
	"マルシン",
	"モケイパドック",
	"桑田商会",
	"玄人の道",
	"童友社",
	"日本模型",
	"スジボリ堂",
	"ウェーブ"
])

  let header = $state([
    { key: "brand", name: "ブランド" },
    { key: "category", name: "カテゴリ" },
    { key: "created_at", name: "更新日時" }, //2026-09-07T04:58:+00:00
    { key: "update_at", name: "更新日時" },
    { key: "id", name: "Id" },
    { key: "jancode", name: "JANコード" },
    { key: "maker", name: "メーカー" },
    { key: "meta", name: "メタ情報" },
    { key: "name", name: "品名" },
    { key: "price", name: "単価" },
    { key: "quantity", name: "数量" },
    { key: "seo", name: "SEO" },
    { key: "seriescode", name: "シリーズコード" },
  ])

  /*******************
   * funcrion
   */

  onMount(async () => {
		isLoading = true
		listData.page=0
		await getDataList()
    isLoading = false
  })
	/**
	 * データ取得
	 */
	async function getDataList(){
		beforeEditData = null
		listData.isOpen=false
		let where = ''
		if(listData.where['maker']!=''){
			where+=`maker like '%${listData.where['maker']}%'`
		}
		if(listData.where['category']!=''){
			if(where!='')where +=' and '
			where+= `category like '%${listData.where['category']}%'`
		}
		if(listData.where['name']!=''){
			if(where!='')where +=' and '
			where+= `name like '%${listData.where['name']}%'`
		}
    const result = await $account.getDb("products",{where:where,orderBy:'category,name,seriescode',fromIndex:(listData.page)*MAX_ONE_PAGE_ROW,count:MAX_ONE_PAGE_ROW})
    if (result.ok) {
			const countResult = await $account.getDbCount("products",{where:where})
			if(countResult.ok){
				listData.totalCount = countResult.data
			}
      listData.list = result.data
      for (let idx in listData.list) {
        listData.list[idx]["editQuantity"] = null
      }
			beforeEditData = JSON.stringify(listData.list)
    }
		listData.isOpen=true
	}

	/**
	 * ページ移動する時に、修正があったら更新を実行するか確認
	 */
	async function checkEditable(){
		// 変更がある場合
		if(beforeEditData!=JSON.stringify(listData.list)){
			if(window.confirm("変更があります。更新しますか")==false){
				return
			}
			beforeEditData=JSON.stringify(listData.list)
			await saveBulk()
		}
	}

	/**
	 * 一括更新
	*/
	async function saveBulk(){
		let updateData=[]
		for(const val of listData.list){
			let maker=val.maker
			if(maker=='ミニ四駆'){
				maker='タミヤ'
			}else if(maker=='ガンダム'){
				maker='バンダイ'
			}
			updateData.push({
				brand:val.brand,
				category:val.category,
				jancode:val.jancode,
				maker:maker,
				meta:val.meta,
				name:val.name,
				price:val.price,
				quantity:val.quantity,
				seo:val.seo,
				seriescode:val.seriescode})
				if(val.id){
					updateData[updateData.length-1].id = val.id
				}
		}

		const lastList=[]
		for(let data of updateData){
			if(data.name!=''){
				lastList.push(data)
			}
		}
		await $account.upsertDb('products',updateData,'jancode')
	}
</script>

<Loading {isLoading}>
  <div class="container">
		<div class="search-space flex">
			<Input type="datalist" exclass="f1" list={makerList} placeholder="製造元" bind:value={listData.where['maker']}
				on:change={async()=>{listData.page=0;await getDataList()}}
			/>
			<Input type="datalist" exclass="f1" list={categoryList} placeholder="カテゴリー" bind:value={listData.where['category']}
			on:change={async()=>{listData.page=0;await getDataList()}}
			/>
			<Input type="text" exclass="f1" placeholder="品名" bind:value={listData.where['name']}
			on:change={async()=>{listData.page=0;await getDataList()}}
			/>
		</div>
		<!--テーブル-->
		<Loading isLoading={!listData.isOpen}>
      <table class="full-width">
        <thead class="sticky">
          <tr>
						{#if listData.where.maker==''}
            <th>メーカー</th>
						{/if}
						{#if listData.where.category==''}
            <th>カテゴリー</th>
						{/if}
            <th>コード</th>
            <th class="stock-name" onclick={(()=>{selectedNameEditor=!selectedNameEditor})}>品名</th>
            <th>数量</th>
            <th>単価</th>
            <th>JANコード</th>
          </tr>
        </thead>
        <tbody>
          {#each listData.list as data, idx}
            <tr>
							{#if listData.where.maker==''}
								<td>
									<Input type="datalist"
									list={makerList}
									bind:value={data.maker}></Input></td>
							{/if}
							{#if listData.where.category==''}
              <td
                ><Input
                  type="datalist"
                  list={categoryList}
                  bind:value={data.category}
                ></Input></td>
							{/if}
              <td class="align-center"><Input exclass="align-center" type="text" bind:value={data.seriescode} /></td>
              <td class="break-word">
								{#if selectedNameEditor}
									<Input type="text" bind:value={data.name}/>
								{:else}
								<div>{data.name}</div>
							{/if}
							</td>
              <td class="flex">
                <div class="f1">
                  <Format type="number" value={data.quantity}></Format>
                </div>
                <div class="f2">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    bind:value={data.editQuantity}
                  ></Input>
                </div>
              </td>
              <td><Input type="number" bind:value={data.price}/></td>
              <td><Input type="text" bind:value={data.jancode}></Input></td>
            </tr>
          {/each}
        </tbody>
      </table>
		</Loading>
		<!--テーブル-->

<!--FAB------------------------------------------------------------------->
    <Fab>
      <span class="f1">
        <button
          class="btn reset-btn" onclick={() => {isStocklistOption =!isStocklistOption}}><Icon value="more_horiz"></Icon>
				</button>
			<!--オプションコンテンツメニュー-->
			<ContentsMenu id="stocklistOption" value={isStocklistOption}
				on:close={()=>{isStocklistOption=false}}
			>
			<div style="width:100%;">
				<button class="btn" style="height:4em;"
					onclick={async ()=>{
						await uploadData.uploadFunc()
					}}
				><Icon value="upload"/>アップロード</button>
				<button class="btn" style="height:4em;"
					onclick={async ()=>{
						await uploadData.uploadJson()
					}}
				><Icon value="upload"/>jsonアップロード</button>

				<button class="btn" style="height:4em;"><Icon value="download"/>ダウンロード</button>

				uploadJson
			</div>
			</ContentsMenu>
			<!-- 戻る-->
      </span>
      <span class="f1">
        <button class="btn"
					disabled={0>=listData.page}
					onclick={async()=>{
						if(0<listData.page){
							await checkEditable()
							listData.page--
							await getDataList()
						}
					}}
				><Icon value="arrow_back_ios"></Icon></button>
      </span>
			<!-- 進む-->
      <span class="f1">
        <button class="btn" 
					disabled={listData.totalCount<(MAX_ONE_PAGE_ROW*(listData.page+1))}
					onclick={async()=>{
						await checkEditable()
						listData.page++
						await getDataList()
					}}
				><Icon value="arrow_forward_ios"></Icon></button>
      </span>
			<!--ページ数　件数-->
			<span class="f2 align-center" style="background:var(--main1);">
				<div>{listData.page+1}/{Math.ceil(listData.totalCount/MAX_ONE_PAGE_ROW)}</div>
				<div><Format type="number" value={listData.totalCount}></Format>件</div>
			</span>
      <span class="f1">
        <button class="btn confirm-btn" onclick={async()=>{await saveBulk();await getDataList()}}>Save</button>
      </span>
    </Fab>
<!--FAB------------------------------------------------------------------->
  </div>

<!--CSVアップロードポップアップ------------------------------------------------------->
  <Popup
    bind:value={uploadData.isOpen}
    on:close={() => {
      uploadData.isOpen = false
    }}
		size
  >
	<span slot="title">アップロード</span>
	<div>
		<div>実数とアップロードファイルの比較</div>
		<div>差分：{uploadData.differenceList.length}件</div>
		<div class="upload-table">
			<table class="full-width">
				<thead>
					<tr>
						<th style="width:5em;">JANコード</th>
						<th style="width:3em;">コード</th>
						<th style="width:10em;">名前</th>
						<th style="width:2em;">実数</th>
						<th style="width:2em;">通販数</th>
					</tr>
				</thead>
				<tbody>
				{#each  uploadData.differenceList as val}
					<tr>
						<td class="align-center">
							<a href="https://console.makeshop.jp/products/{Number(val.makeshopcode)}?shopId=kitboy" target="_blank">{val.jancode}</a></td>
						<td class="align-center">{val.seriescode}</td>
						<td class="break-word">{val.name}</td>
						<td>{val.quantity}</td>
						<td>{val.makeshopQuantity}</td>
					</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div>
			アップロードデータから登録
		</div>
		<div>
			<button class="btn confirm-btn" onclick={async()=>{ await uploadData.uploadSave()}}>アップロード</button>
			<table style="width:100%;">
				<thead>
					<tr>
						<th>JANコード</th>
						<th>コード</th>
						<th>製造元</th>
						<th>カテゴリー</th>
						<th>名前</th>
						<th>実数</th>
					</tr>
				</thead>
				<tbody>
				{#each  uploadData.makeshopList as val}
					<tr>
						<td class="align-center">
							{val.jancode}</td>
						<td class="align-center">{val.makeshopcode}</td>
						<td>{val.maker}</td>
						<td>{val.category}</td>
						<td class="break-word">{val.name}</td>
						<td>{val.quantity}</td>
						<td>{val.makeshopQuantity}</td>
					</tr>
					{/each}
				</tbody>
			</table>

			
		</div>
	</div>
  </Popup>
<!--CSVアップロードポップアップ------------------------------------------------------->
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
