<script>
	/**
	 * 写真を撮影して、そこに写っている帳票の構造と文字を分析
	 * あらかじめ設定しているテンプレートに沿ってデータを返す
	 */
	import { onMount,createEventDispatcher } from "svelte";
	import * as ort from "onnxruntime-web";
	import {MediaClass} from "$lib/MediaClass.js"
  import { account } from "$lib/store";
	const dispatch = createEventDispatcher()
	ort.env.logLevel = "error";
	let isActive = $state(false)
	let element
	let befPos={x:0,y:0}
	let imageUrl = $state("")
	let img = $state("")
	let imageNatural = $state({ width: 1, height: 1 })
	let {struct =[],mode=$bindable(-1),value=$bindable({})} = $props()
	let imageElement
	let items = $state([])
	let rowList = $state([])
	let positionObj = $state(null)
	let scanRect = $state({s:{x:0,y:0},e:{x:0,y:0}})

	$effect(async() => {
		switch(mode){
			//初期化
			case 0:
				console.log('0')
				befPos={x:0,y:0}
				imageUrl=''
				img=''
				imageNatural = { width: 1, height: 1 }
				items=[]
				rowList=[]
				positionObj=null
				scanRect = {s:{x:0,y:0},e:{x:0,y:0}}
			break
			case 1:
				await uploadFile()
			break
			case 2:
				await extraction()
			break
		}
	})

	onMount(async () => {
		try {
			isActive = true
		} catch (e) {
			alert(e)
			console.error(e)
		}
	});

	function uploadFile() {
		element.click()
	}

	/**
	 * アップロード
	 * @param e
	 */
	async function upload(e) {
		let file = e.target.files[0]
		if (!file) return;
		let base64 = await MediaClass.fileToBase64(file)
		const resize = await MediaClass.resizeImage(base64,1000)
		resize.base64 =await MediaClass.contrast(resize.base64,100)
		file = await MediaClass.base64ToFile(resize.base64)
		imageUrl = URL.createObjectURL(file)
		img = new Image()
		await new Promise((resolve) => {
			img.onload = resolve
			img.src = imageUrl
		})
		scanRect.s.x = 10
		scanRect.s.y = 10
		scanRect.e.x = img.naturalWidth-10
		scanRect.e.y = img.naturalHeight-10
		imageNatural = {
			width: img.naturalWidth,
			height: img.naturalHeight
		}
		mode=-1
	}
	/**
	 * 文字抽出
	 */
	async function extraction(){
		try {
			const start = performance.now()
			const resizeImg =await MediaClass.clipping(img,
				scanRect.s.x,
				scanRect.s.y,
				scanRect.e.x-scanRect.s.x,
				scanRect.e.y-scanRect.s.y)
			const [result] = await $account.scanOcr(resizeImg)
			items = []
			rowList=[]
			const rowPositionList=[]
			let fontSize=0
			for(let item of result.items){
				const pos={
					text:item.text,
					poly:item.poly,
					x:item.poly[0][0]+scanRect.s.x,
					y:item.poly[0][1]+scanRect.s.y,
					ex:item.poly[1][0]+scanRect.s.x,
					ey:item.poly[1][1]+scanRect.s.y}
				fontSize=(fontSize+(pos.ey-pos.y))
				items.push(pos)
				rowPositionList.push(pos.y)
			}
			value={}
			for(const block of struct){
				const targetX = (block.px/100)*getClippingWidth()
				const targetY = (block.py/100)*getClippingHeight()
				const targetW = (block.pw/100)*getClippingWidth()
				const targetH = (block.ph/100)*getClippingHeight()
				const colision = items.find((v)=>{
					return 	isCollision(
						targetX,
						targetY,
						targetW,
						targetH,
						v.x-scanRect.s.x,
						v.y-scanRect.s.y,
						v.ex - v.x,
						v.ey - v.y
					)
				})
				if(colision!=undefined){
					value[block.id] = colision.text
				}
			}
			value=value
		} catch (error) {
		}
		mode=4
		dispatch('extraction',value)
	}

	function isCollision(ax, ay, aw, ah, bx, by, bw, bh) {
		return !(
			ax + aw < bx ||
			bx + bw < ax ||
			ay + ah < by ||
			by + bh < ay
		)
	}

	/*
	* 
	* @param {number[]} values
	* @param {number} threshold 平均値からの許容距離
	* @returns {number[]}
	*/
	function makePeaks(values, rowLine) {
		if (!values.length) return []
		const sorted = [...values].sort((a, b) => a - b)
		const result =[]
		let befY=0
		for(const y of sorted){
			if(y>befY+10){
				befY = y
				result.push(y)
			}
		}
		return result
	}

	function getClippingWidth(){
		return scanRect.e.x-scanRect.s.x
	}
	function getClippingHeight(){
		return scanRect.e.y-scanRect.s.y
	}

	/**
	 * 範囲を開始する
	 */
	function startScanRange(pos){
		positionObj = pos
		befPos.x=pos.x
		befPos.y=pos.y
	}
	function moveScanRange(e){
		e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
		const x = Math.round(e.clientX-rect.left)
		const y = Math.round(e.clientY-rect.top)
		positionObj.x += (x - befPos.x)
		positionObj.y += (y - befPos.y)
		befPos.x = x
		befPos.y = y
		/**/
	}
	function upScanRange(e){
		e.currentTarget.releasePointerCapture(e.pointerId)
		positionObj=null
	}
</script>

<input
	bind:this={element}
	type="file"
	style="display:none"
	onchange={upload}
/>
<!-- {#if isActive}
	<button class="input-button" onclick={uploadFile}>アップロード</button>
	<button class="input-button" onclick={extraction}>文字抽出</button>
{/if} -->
<div class="image-form">
	<div class="viewer">
		{#if imageUrl}
			<img
				bind:this={imageElement}
				src={imageUrl}
				alt=""
			/>
			<svg
				class="overlay"
				viewBox={`0 0 ${imageNatural.width} ${imageNatural.height}`}
				preserveAspectRatio="none"
			>
				{#each items as item}
					<text
						x={item.x}
						y={item.y}
						font-size="20"
						fill="rgba(255,0,0,0.9)"
						font-family="sans-serif"
					>
						{item.text}
					</text>
					<!--
					<polygon
						points={`
						${item.poly[0][0]+scanRect.s.x},${item.poly[0][1]+scanRect.s.y}
						${item.poly[1][0]+scanRect.s.x},${item.poly[1][1]+scanRect.s.y} 
						${item.poly[2][0]+scanRect.s.x},${item.poly[2][1]+scanRect.s.y} 
						${item.poly[3][0]+scanRect.s.x},${item.poly[3][1]+scanRect.s.y} 
						`}
						fill="rgba(255,0,0,0.08)"
						stroke="red"
						stroke-width="2"
					/>
					-->
				{/each}
				{#each struct as item}
					<rect
						x={(item.px/100)*getClippingWidth()+scanRect.s.x}
						y={(item.py/100)*getClippingHeight()+scanRect.s.y}
						width={(item.pw/100)*getClippingWidth()}
						height={(item.ph/100)*getClippingHeight()}
						stroke="blue"
						fill="rgba(255,0,0,0.0)"
						stroke-width="2"
					/>
				{/each}
					<rect
						x={scanRect.s.x}
						y={scanRect.s.y}
						width={scanRect.e.x-scanRect.s.x}
						height={scanRect.e.y-scanRect.s.y}
						fill="rgba(255,0,0,0.1)"
						stroke={positionObj!=null?'blue':'red'}
						stroke-width="2"
					/>
					<rect
						class="pointer"
						x={scanRect.s.x-10}
						y={scanRect.s.y-10}
						width={20}
						height={20}
						fill="red"
						onpointerdown={(e)=>{startScanRange(scanRect.s)}}
					></rect>
					<rect
						class="pointer"
						x={scanRect.e.x-10}
						y={scanRect.e.y-10}
						width={20}
						height={20}
						fill="red"
						onpointerdown={(e)=>{startScanRange(scanRect.e)}}
					></rect>
			</svg>
			{#if positionObj!=null}
				<div style="touch-action: none;overscroll-behavior: none;background:rgba(0,255,0,0.1);position:absolute;top:0;left:0;width:{imageNatural.width}px; height:{imageNatural.height}px;"
					onpointermove={(e)=>{moveScanRange(e)}}
					onpointerup={(e)=>{upScanRange(e)}}
				></div>
			{/if}
		{/if}
	</div>
</div>
<style>
	.image-form{
		width:calc(100%-50px);
		height:100%;
		padding-left:25px;
		padding-right:25px;
		overflow: auto;
	}
	.image-form *{
		overscroll-behavior: none!important;
	}
	.viewer {
		position: relative;
		display: inline-block;
		overscroll-behavior: none!important;
	}
	.viewer img {
		display: block;
		user-select: none;
		-webkit-user-drag: none;
	}

	.overlay {
		position: absolute;
		inset: 0;
	}
	pre {
		white-space: pre-wrap;
		word-break: break-word;
	}
	.pointer {
		cursor: nwse-resize;
	}
</style>