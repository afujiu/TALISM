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
	let realStruct = $state([])
	let selectRect = $state(null)
	const befPos = $state({x:0,y:0})
	let isLoading = $state(true)
	let extractionList = $state([])
	let extractionState=$state('')
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
			console.log('changeCameraOption')
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
				console.error('カメラの起動に失敗:', e)
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
		showImageBase64= await MediaClass.binarizeBase64(base64,binarizeLimit)
		imageSize.width = width
		imageSize.height = height
		scanRect.s.x = 20
		scanRect.s.y = 20
		scanRect.e.x = width-20
		scanRect.e.y = height-20
		resizeScanRect()
		await extraction()
	}

	/**
	 * 画像の編集
	 */
	async function retouchImage(){
		showImageBase64= await MediaClass.binarizeBase64(imageBase64,binarizeLimit)
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
			realStruct.push({id:block.id,x:targetX,y:targetY,width:targetW,height:targetH})
		}
	}

	function getClippingWidth(){
		return scanRect.e.x-scanRect.s.x
	}
	function getClippingHeight(){
		return scanRect.e.y-scanRect.s.y
	}

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
				poly:item.poly
			})
		}
		extractionState='抽出完了'
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
				{#each realStruct as item}
					<rect
						x={item.x}
						y={item.y}
						width={item.width}
						height={item.height}
						stroke={selectRect!=null?'blue':'red'}
						fill="rgba(255,0,0,0.0)"
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
				<!-- タッチ範囲-->
				<div class="surface" style="width:{imageSize.width}px;height:{imageSize.height}px;"
					onpointerdown={(e)=>{downScanRange(e)}} 
					onpointermove={(e)=>{moveScanRange(e)}}
					onpointerup={(e)=>{upScanRange(e)}}
				></div>
				{#each extractionList as data}
				<input type="text" class="extraction-text" style="left:{data.sx}px;top:{data.sy}px;" bind:value={data.text}>
				{/each}
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
					<span class="f1"><input type="range" bind:value={binarizeLimit} onchange={async()=>{await retouchImage()}} min=1 max=255 step=1></span>
					<span class="f1"><button class="btn confirm-btn" onclick={async()=>{await extraction()}}>抽出</button></span>
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
	}
	.extraction-text{
		position:absolute;
		background:rgba(0,0,0,0);
		border:none;
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