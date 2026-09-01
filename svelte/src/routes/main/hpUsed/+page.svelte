<script>
	import { onMount } from "svelte"
	import { account,ui } from '$lib/store'
	import {ymdhm} from '$lib/Date.js'
	import Loading from '$comp/Loading.svelte'
	import Fab from '$comp/Fab.svelte'
  import Spreadsheet,{SpreadsheetClass} from "$comp/Spreadsheet.svelte";
	import Popup from "$comp/Popup.svelte";
	/*******************
	 * argument
	*/

	const KV_KEY='usedList_bk'
	const MEDIA_URL='usedMedia_bk'
	let isLoading=$state(true)
	let isSaving=$state(false)
	let spread=new SpreadsheetClass()
	let beforeData= []
	/**
	 * 初期設定
	 */
	onMount(async() => {
		// スプレットシートの設定
		spread.init([
			{id:'showDate',name:'公開日',type:'datetime',required:false},
			{id:'saleDate',name:'販売日',type:'datetime',required:false},
			{id:'id',name:'ID',type:'text',width:'20em',required:true,noDuplicates:true,
				initFunc:()=>{return ymdhm();}
			},
			{id:'name',name:'名前',type:'text',width:'50em',required:true},
			{id:'media',name:'メディア',type:'media',width:'10em',required:false,base64Func:async(filename)=>{
				const result = await $account.getMediaBase64('cf_api_media',MEDIA_URL+'/'+filename)
				return result
			}},
			{id:'category',name:'カテゴリ',width:'20em',type:'select',list:['ハンドガン','リボルバー','サブマシンガン','ライフル','ショットガン','PDW','その他'],required:true},
			{id:'action',name:'動作方式',width:'25em',type:'select',list:['エアーコッキング','電動','次世代電動','ガス'],required:true},
			{id:'price',name:'中古価格',type:'number',required:true},
			{id:'oldprice',name:'定価',type:'number',required:true},
			{id:'speed',name:'弾速',type:'text',required:false},
			{id:'custom',name:'カスタム内容',type:'textarea',required:false},
			{id:'tag',name:'メタタグ',type:'textarea',required:false},
			{id:'inside',name:'内部カスタム',type:'textarea',required:false},
			{id:'state',name:'商品状態',type:'textarea',required:false}
		])
		await getList()
	})

	/**
	 * データ取得
	 */
	async function getList(){
		let list = await $account.getKvText('cf_api_kv',KV_KEY)
		if(list==null||list==''){
			beforeData=[]
			list=[]
		}else{
			beforeData = JSON.parse(list)
			spread.initList(JSON.parse(list))
		}
		isLoading=false
	}
	/**
	 * リセット
	 */
	async function reset(){
		isSaving=true
		spread.list = JSON.parse(JSON.stringify(beforeData))
		isSaving=false
	}
	/**
	 * 保存
	 */
	async function save(){
		$ui.addNotification(`${$ui.selectedMenuName} 更新`,async()=>{
			isSaving=true
			const errorList = spread.checkError()
			if(errorList.length>0){
				isSaving=false
				return {status:false,message:errorList.join('<br>')}
			}
			// 現行のメディアを取得
			const resultList = JSON.parse(JSON.stringify(spread.list))
			const mediaList=[]

			//既存メディア一覧を取得
			for(let i in resultList){
				if(resultList[i].media!=null){
					for(let j in resultList[i].media){
						const oneMedia = resultList[i].media[j]
						mediaList.push({name:oneMedia.name,src:oneMedia.src})
					}
				}
			}

//************************************
//#region 行単位かメディアが削除されている場合は、その分をAPIで削除
			const mediaListObj={before:[],now:[]}
			for(let key in mediaListObj){
				let data = null
				if(key=='before'){
					data = beforeData
				}else{
					data = resultList
				}
				const mediaListName = mediaListObj[key]
				for(const used of data){
					if(used.media!=null){
						for(let media of used.media){
							mediaListName.push(media.name)
						}
					}	
				}
			}

			const beforeMedia = [...new Set(mediaListObj.before)]
			const nowMedia = new Set(mediaListObj.now)
			const deleteMediaList = beforeMedia.filter(name => !nowMedia.has(name))
			// メディア削除
			for (let filename of deleteMediaList) {
				await $account.deleteMedia('cf_api_media', `${MEDIA_URL}/${filename}`)
			}
//#endregion
//************************************


//************************************
//#region メディア情報が更新されてい場合は、メディアを全てbase64化
			for(let one of resultList){
				const existBefore = beforeData.find(v=>v.id == one.id)
				// 過去データが存在する場合はメディア情報が変わっている場合はbase64化し、更新
				if(existBefore!=undefined){
					const currentMediaStr = JSON.stringify(one.media)
					const beforeMediaStr = JSON.stringify(existBefore.media)
					// メディアリストが変わっている場合はbase64化する
					if(currentMediaStr!=beforeMediaStr){
						for(let i in one.media){
							const media = one.media[i]
							const base64 = await $account.getMediaBase64('cf_api_media',MEDIA_URL+'/'+media.name)
							if(base64==null){
								continue
							}
							media.src = base64
						}
					}
				}
			}
//#endregion
//************************************

//************************************
//#region メディア名更新
			for(let i in resultList){
				if(resultList[i].media!=null){
					for(let j in resultList[i].media){
						//ファイル名を更新
						const media = resultList[i].media[j]
						const ext = typeof media.name === 'string' && media.name.includes('.')
							? `.${media.name.split('.').pop()}`
							: ''
						const newName = `${resultList[i].id}_${Number(j) + 1}${ext}`
						media.name = newName
					}
				}
			}
//#endregion
//************************************

//************************************
//#region メディア登録
			for(let i in resultList){
				if(resultList[i].media==null){
					continue
				}
				for(let j in resultList[i].media){
					const media = resultList[i].media[j]
					//新規登録分のメディアだけ登録処理を行う
					if (typeof media.src !== 'string' || !media.src.startsWith('data:')) {
						continue
					}
					let resultMediSrc = await $account.postMedia('cf_api_media',MEDIA_URL+'/'+media.name,media.src)
					media.src = resultMediSrc.publicUrl
				}
			}
//#endregion
//************************************
			// JSON登録
			await $account.postKvText('cf_api_kv',KV_KEY,JSON.stringify(resultList))
			beforeData = JSON.parse(JSON.stringify(resultList))
			spread.list = JSON.parse(JSON.stringify(resultList))
			isSaving=false
			return {status:true,message:'更新完了'}
		})
	}
</script>
<Loading isLoading={isLoading}>
	<Spreadsheet bind:value={spread}></Spreadsheet>
	<Fab>
		<span class="f1">
			<button class="btn reset-btn" disabled={isSaving} onclick={async()=>{await reset()}}>Reset</button>
		</span>
		<span class="f1">
			<button class="btn confirm-btn" disabled={isSaving} onclick={async()=>{await save()}}>Save</button>
		</span>
	</Fab>

</Loading>
<style>
	.popup-span div{
		display:flex;
	}
	.fab-button{
		margin:1px;
	}
	.popup-span div span{
	}
</style>

