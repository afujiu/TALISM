<script>
	/**
	 * 写真を撮影して、そこに写っている帳票の構造と文字を分析
	 * あらかじめ設定しているテンプレートに沿ってデータを返す
	 */
	import { onMount,onDestroy,createEventDispatcher } from "svelte";
	import * as ort from "onnxruntime-web";
	import { account,ui } from '$lib/store'
	import {MediaClass} from "$lib/MediaClass.js"
	import {uploadImageBase64} from "$lib/Upload.js"
	import Popup from "$comp/Popup.svelte"
	import Icon from "$comp/Icon.svelte"
	import Loading from "$comp/Loading.svelte"
	import { PaddleOCR } from "@paddleocr/paddleocr-js";
	const dispatch = createEventDispatcher()

	let {title='OCR',struct =[],isPopup=$bindable(false)} = $props()
	let imageElement = $state(/** @type {HTMLImageElement|null} */ (null))
	let imageBase64 = $state(/** @type {string|null} */ (null))
	let showImageBase64 = $state(/** @type {string|null} */ (null))
	let imageSize = $state({width:0,height:0})
	let video = $state(/** @type {HTMLVideoElement|null} */ (null))
	let stream = $state(/** @type {MediaStream|null} */ (null))
	// 納品書矩形枠を作成する
	let scanRect = $state({s:{x:0,y:0},e:{x:0,y:0}})
	// struct(パーセント座標)から実座標の一覧
	let realStruct = $state([])
	// 選択した矩形範囲編集用の座標オブジェクト格納(未選択:null,開始:s,終了:e)
	let selectRect = $state(null)
	const befPos = $state({x:0,y:0})

	let isLoading = $state(true)
	// 抽出した文字列の座標込み一覧{sx,sy,ex,dy,text,poly,isHit}
	let extractionList = $state([])

	let extractionState=$state('')
	// 抽出文字の修正モードフラグ(固定:false,編集:true)
	let isEditExtractionText=$state(false)
	//二値化閾値
	let binarizeLimit = $state(128)
	/*******************
	 * function
	*/
	onMount(async () => {
		isLoading = true
		// キャッシュn
		if($account.getCache('ocr')==null){
			const ocr = await PaddleOCR.create({
			lang: "japan",
			ocrVersion: "PP-OCRv5",
			worker: true,
			ortOptions: {
				backend: "wasm",
				numThreads: navigator.hardwareConcurrency || 4,
				simd: true,
				}
		})
			$account.addCache('ocr',ocr)
		}
		stopImageCamera()
		isLoading=false
		extractionState=''
	})
	function init(){
		imageBase64=null
		showImageBase64=null
		extractionList = []
		extractionState=''
	}

	/**
	 * カメラで納品書スキャン
	 */
	async function getImageCamera(){
		stopImageCamera()
		const changeCameraOption= async()=>{
			try{
				let width=window.innerWidth
				let height=window.innerHeight
				stream = await navigator.mediaDevices.getUserMedia({
					video: {
						facingMode: 'environment',
						width: { ideal: width },
						height: { ideal: height },
					},audio: false})
				if (video) video.srcObject = stream
			} catch (e) {
				$ui.addNotification(`${$ui.selectedMenuName} カメラの起動に失敗`,async()=>{
					return {status:true,message:`エラー:${e instanceof Error ? e.message : String(e)}`}
				})
			}
		}
		window.addEventListener('resize',changeCameraOption)
		await changeCameraOption()
	}

	/**
	 * カメラ停止
	 */
	function stopImageCamera(){
		if (stream) {
			stream.getTracks().forEach(track => track.stop())
			stream = null
		}
		if (video) {
			video.srcObject = null
		}
	}

	/**
	 * カメラ情報取得
	 */
	async function shotCamera(){
		if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA){
			return
		}
		const canvas = document.createElement('canvas')
		canvas.width = video.videoWidth
		canvas.height = video.videoHeight
		const context = canvas.getContext('2d')
		if (!context) return
		context.drawImage(video, 0, 0, canvas.width, canvas.height)
		await initImage(canvas.toDataURL('image/jpeg', 0.9),canvas.width,canvas.height)
		stopImageCamera()
	}

	/**
	 * ファイルから納品書画像を取得
	 */
	async function getImageFile(){
		stopImageCamera()
		imageBase64=null
		showImageBase64=null
		try{
			const fileData = await uploadImageBase64()
			await initImage(fileData.src,fileData.width,fileData.height)
		}catch(e){
			$ui.addNotification(`${$ui.selectedMenuName} ファイルスキャン`,async()=>{
				return {status:true,message:`エラー:${e instanceof Error ? e.message : String(e)}`}
			})
		}
	}
	/**
	 * 納品書画像を取得する
	 * @param base64
	 * @param width
	 * @param height
	 */
	async function initImage(base64,width,height){
		extractionList=[]
		extractionState=''
		imageBase64 = base64
		showImageBase64= base64
		imageSize.width = width
		imageSize.height = height
		//初期だけ場所指定
		if(scanRect.s.x==0 && scanRect.e.x==0){
			scanRect.s.x = 20
			scanRect.s.y = 20
			scanRect.e.x = width-20
			scanRect.e.y = height-20
		}
		resizeScanRect()
		await extraction()
	}

	/**
	 * スキャン範囲が変わった時、realStructを変更する
	 */
	function resizeScanRect(){
		realStruct=[]
		for(const block of struct){
			const targetX = (block.px/100)*getClippingWidth()+scanRect.s.x
			const targetY = (block.py/100)*getClippingHeight()+scanRect.s.y
			const targetW = (block.pw/100)*getClippingWidth()
			const targetH = (block.ph/100)*getClippingHeight()
			realStruct.push({id:block.id,x:targetX,y:targetY,width:targetW,height:targetH,isHit:null})
		}
		updateExtractionHits()

	}

	function getClippingWidth(){
		return scanRect.e.x-scanRect.s.x
	}
	function getClippingHeight(){
		return scanRect.e.y-scanRect.s.y
	}


//#region 取得範囲矩形の操作
	/**
	 * 範囲をダウン
	*/
	function downScanRange(e){
		selectRect=null
		e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
		const x = Math.round(e.clientX - rect.left)
		const y = Math.round(e.clientY - rect.top)
		befPos.x = x
		befPos.y = y
		//開始ポインタを指定
		if(scanRect.s.x-10 <= x && x <= scanRect.s.x+20&&
			scanRect.s.y-10 <= y && y <= scanRect.s.y+20){
				selectRect = scanRect.s
		}else if(scanRect.e.x-10 <= x && x <= scanRect.e.x+20&&
			scanRect.e.y-10 <= y && y <= scanRect.e.y+20){
			selectRect = scanRect.e
		}
	}
	/**
	 * 範囲を移動
	 * @param e
	 */
	function moveScanRange(e){
		if(selectRect==null){
			return
		}
		e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
		const x = Math.round(e.clientX-rect.left)
		const y = Math.round(e.clientY-rect.top)
		selectRect.x += (x - befPos.x)
		selectRect.y += (y - befPos.y)
		if(selectRect.x<0){
			selectRect.x=1
		}
		if(imageSize.width<selectRect.x){
			selectRect.x=imageSize.width-1
		}

			if(selectRect.y<0){
			selectRect.y=1
		}
		if(imageSize.height<selectRect.y){
			selectRect.y=imageSize.height-1
		}

		befPos.x = x
		befPos.y = y
		resizeScanRect()
		/**/
	}

	/**
	 * 範囲を確定
	 * @param e
	 */
	function upScanRange(e){
		selectRect=null
	}
//#endregion


//#region 文字抽出
	/**
	 * 文字抽出
	 */
	async function extraction(){
		extractionState='画像変換'
		const ocr = $account.getCache('ocr')
		const base64 = imageBase64
		const img = await MediaClass.base64ToImage(base64)
		extractionState='文字抽出中'
		const [result] = await ocr.predict(img,{textDetUnclipRatio: 1.5})
		extractionList=[]
		for(let item of result.items){
			extractionList.push({
				sx:item.poly[0][0],
				sy:item.poly[0][1],
				ex:item.poly[1][0],
				ey:item.poly[1][1],
				text:item.text,
				poly:item.poly,
				isHit:null,
			})
		}
		updateExtractionHits()
		extractionState='抽出完了'
	}

	/**
	 * 抽出文字の矩形とstructブロックの交差状態を更新する
	 */
	function updateExtractionHits(){
		for(const extraction of extractionList) extraction.isHit = null
		for(const block of realStruct) block.isHit = null

		for(const extraction of extractionList){
			const block = realStruct.find((block) =>
				extraction.sx < block.x + block.width &&
				extraction.ex > block.x &&
				extraction.sy < block.y + block.height &&
				extraction.ey > block.y
			)
			if(block){
				extraction.isHit = block
				block.isHit = extraction
			}
		}
	}

//#endregion


	/**
	 * 不足追加
	 * realStructでisHitがnullの要素(必要な文字を取得できていない)座標にExtractionを追加する
	 */
	function addExtractionList(){
		for(const block of realStruct.filter((item) => item.isHit === null)){
			extractionList.push({
				sx:block.x+(block.width/2),
				sy:block.y+(block.height/2),
				ex:block.x+block.width,
				ey:block.y+block.height,
				text:'',
				poly:null,
				isHit:null
			})
		}
		resizeScanRect()
	}

	/**
	 * 確定
	 */
	function confirm(){
		let rowsList={}
		for(const i in realStruct){
			const block =realStruct[i]
			if(block.isHit==null){
				continue
			}
			const extraction = block.isHit
			if(extraction.text==''){
				continue
			}
			let [key, idx] = block.id.split('_')
			if(rowsList[idx]==null){
				rowsList[idx]=[]
			}
			rowsList[idx].push({key:key,text:extraction.text})
		}
		rowsList = Object.fromEntries(
			Object.entries(rowsList).sort(([left], [right]) => Number(left) - Number(right))
		)
		const resultList=[]
		for(let i in rowsList){
			const data = rowsList[i]
			const oneRow={}
			for(let oneRowData of data){
				oneRow[oneRowData.key] = oneRowData.text
			}
			resultList.push(oneRow)
		}
		isPopup=false
		stopImageCamera()
		imageBase64=null
		dispatch('extraction',resultList)
	}
	/**
	 *　ポップアップを閉じて初期化する
	 */
	async function close(){
		isPopup=false
		stopImageCamera()

	}

	onDestroy(() => {
		stopImageCamera()
	});
</script>
	<Popup bind:value={isPopup} width="90%" height="90%" on:close={async()=>{await close()}}>
		<span slot="title">
			{title} {#if extractionState!=''}...{extractionState}{/if}
		</span>
		
		<div class="ocr">
		<!--カメラ使用時-->
		{#if imageBase64==null}
			<video 
				bind:this={video}
				autoplay
				playsinline
				muted
				class="full-width full-height"
				style="padding:0;"
			></video>
			{/if}
			<!--納品書画像-->
			<div class="image-base" style="transform: scale(1);">
			{#if imageBase64!=null}
				<img
					bind:this={imageElement}
					src={showImageBase64}
					alt=""
				/>
				<svg class="svg-overlay"viewBox={`0 0 ${imageSize.width} ${imageSize.height}`} preserveAspectRatio="none"
					style="width:{imageSize.width}px;height:{imageSize.height}px;"
				>
				<!-- structに応じてOCRする範囲を表示-->
				{#each realStruct as block}
					<rect
						x={block.x}
						y={block.y}
						width={block.width}
						height={block.height}
						fill="rgba(255,0,0,0.0)"
						stroke={block.isHit?'blue':'red'}
						stroke-width="2"
					/>
				{/each}
					<rect
						class="pointer"
						x={scanRect.s.x}
						y={scanRect.s.y}
						width={scanRect.e.x - scanRect.s.x}
						height={scanRect.e.y - scanRect.s.y}
						stroke-width="1"
						stroke="blue"
						fill="rgba(255,0,0,0.1)"
					></rect>
					<!--開始-->
					<rect
						x={scanRect.s.x-10}
						y={scanRect.s.y-10}
						width=20
						height=20
						stroke="red"
						fill="red"
					>
					</rect>
					<!--終了-->
					<rect
						x={scanRect.e.x-10}
						y={scanRect.e.y-10}
						width=20
						height=20
						stroke="red"
						fill="red"
					>
					</rect>
				</svg>
				<!--抽出文字(固定)-->
					{#if !isEditExtractionText}
						{#each extractionList as data}
							<span class="extraction-text" style="left:{data.sx}px;top:{data.sy}px; color:{data.isHit?'blue':'red'};">{data.text}</span>
						{/each}
					{/if}
				<!-- タッチ範囲-->
				<div class="surface" style="width:{imageSize.width}px;height:{imageSize.height}px;"
					onpointerdown={(e)=>{downScanRange(e)}} 
					onpointermove={(e)=>{moveScanRange(e)}}
					onpointerup={(e)=>{upScanRange(e)}}
				></div>
				<!--抽出文字-->
					{#if isEditExtractionText}
					{#each extractionList as data}
						<input type="text" class="extraction-text" style="left:{data.sx}px;top:{data.sy}px;color:{data.isHit?'blue':'red'};" bind:value={data.text}>
					{/each}
					{/if}
			{/if}
			</div>
		</div>
		<span slot="footer" class="full-width full-height">
			<Loading {isLoading} title="">
				<div class="flex full-height">
				<!--画像取得前-->
				{#if imageBase64==null}
					<span class="f1"><button class="btn" onclick={async()=>{await getImageFile()}}>ファイル</button></span>
					{#if stream==null}
						<span class="f1"><button class="btn" onclick={async()=>{await getImageCamera()}}>カメラ</button></span>
					{:else}
						<span class="f1"><button class="btn confirm-btn" style="vertical-align:middle;" onclick={shotCamera}><Icon value="camera"></Icon><span>撮影</span></button></span>
					{/if}
				{:else}
					<span class="f1"><button class="btn reset-btn" onclick={init}>戻る</button></span>
					<span class="f1">
						<button class="btn" onclick={()=>{isEditExtractionText=!isEditExtractionText}}>
							{#if isEditExtractionText}
							<Icon value="lock"></Icon>固定
							{:else}
							<Icon value="edit"></Icon>編集
							{/if}
						</button>
					</span>
					<span class="f1"><button class="btn" onclick={()=>{addExtractionList()}}>不足追加</button></span>
					<span class="f1"><button class="btn confirm-btn" onclick={async()=>{await confirm()}}>抽出</button></span>
				{/if}
				</div>
			</Loading>
		</span>
	</Popup>
<style>
	.ocr{
		width:100%;
		height:100%;
		overflow:auto;
	}

	.svg-overlay {
		position: absolute;
		inset: 0;
	}
	.surface{
		position:absolute;
		insert:0;
		left:0;
		top:0;
		width:0;
		height:0;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
	}
	.extraction-text{
		position:absolute;
		background:rgba(0,0,0,0);
		border:none;
		border-bottom:solid 1px;
		border-color:black;
		font-size:15px;
		color:red;
	}
	.image-base{
		position:relative;
		width:100%;
		height:100%;
		overflow:auto;
	}
</style>