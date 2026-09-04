<script>
	import { onMount,onDestroy,createEventDispatcher } from "svelte"
	let { value,id } = $props();
	const dispatch = createEventDispatcher()
	let x = 0
	let y = 0
	let domId = $state('')
	let menuElement
	let anchorTop = true
	$effect(() => {
		if(value && menuElement){
			requestAnimationFrame(() => {
				adjustPosition()
			})
		}
	})
	function updateMousePosition(e) {
		x = e.clientX+30
		y = e.clientY
		close()
	}

	function updateTouchPosition(e) {
		const touch = e.touches[0] ?? e.changedTouches[0]
		if (touch) {
			x = touch.clientX+30
			y = touch.clientY
			close()
		}
	}

	function adjustPosition(){
		if(!menuElement){
			return
		}
		const rect = menuElement.getBoundingClientRect()
		const viewportWidth = window.innerWidth || document.documentElement.clientWidth
		const viewportHeight = window.innerHeight || document.documentElement.clientHeight
		const menuWidth = rect.width || 200
		const menuHeight = rect.height || 220
		let nextX = Math.min(Math.max(x, 10), viewportWidth - menuWidth - 10)
		let nextY = y
		anchorTop = nextY + menuHeight + 10 <= viewportHeight
		if(!anchorTop){
			nextY = Math.max(10, viewportHeight - menuHeight - 10)
		}
		menuElement.style.left = `${nextX}px`
		menuElement.style.top = anchorTop ? `${nextY}px` : 'auto'
		menuElement.style.bottom = anchorTop ? 'auto' : '10px'
	}
	function close(){
		const button=document.querySelector(`#contentMenuClose_${domId}`)
		menuElement.style.zIndex='9999'
		button.addEventListener('click',()=>{
			dispatch('close',{})
		})
	}

	onMount(() => {
		domId  = Math.round(Math.random()*10000000000)+'_'+id
		document.body.appendChild(menuElement)
		window.addEventListener("contextmenu", updateMousePosition);
		window.addEventListener("mousedown", updateMousePosition);
		window.addEventListener("touchstart", updateTouchPosition);
		return () => {
			window.removeEventListener("contextmenu", updateMousePosition);
			window.removeEventListener("mousedown", updateMousePosition);
			window.removeEventListener("touchstart", updateTouchPosition);
		};
	});
	onDestroy(() => {
		const element = document.getElementById('contentsMenu_'+domId)
		if(element){
			element.remove()
		}
	});
</script>
	<span id="contentMenuClose_{domId}" class="close-shadow" style:display="{value?'block':'none'}"></span>
	<div
		id="contentsMenu_{domId}"
		class="contents-menu"
		style:left="{x}px"
		style:top="{anchorTop ? `${y}px` : 'auto'}"
		style:bottom="{anchorTop ? 'auto' : '10px'}"
		style:display="{value?'block':'none'}"
		bind:this={menuElement}
	>
		<slot />
	</div>
<style>
.contents-menu {
	position:fixed;
	min-width:200px;
	display:block;
	z-index:9999;
	background:var(--base1);
	box-shadow:1px 0px 3px 1px rgba(0,0,0,0.2);
}
.contents-menu :global(button) {
	display:block;
	width:100%;
	margin-bottom:5px;
	margin-top:5px;
	padding-bottom:0.2em;
	padding-top:0.2em;
}
.close{
	justify-content: right;
	margin-top:2em;
	width:100%;
}
.close-shadow{
	position:fixed;
	left:0;
	top:0;
	width:100%;
	height:100%;
	z-index:9998;
	background:rgba(0,0,0,0.2);
}
</style>