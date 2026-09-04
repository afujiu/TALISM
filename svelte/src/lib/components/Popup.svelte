<script>
	import { onMount,createEventDispatcher } from "svelte"
	const dispatch = createEventDispatcher()
	/*******************
	 * argument
	*/
	let {value=false} = $props()
	/*******************
	 * function
	*/
	onMount(() => {
		
	})
	function close(){
		dispatch('close',{})
	}
</script>
{#if value}
	<span>
		<div onclick={()=>{close()}} class="shadow"></div>
		<div class="card">
			<div class="popup-title">
				<slot name="title"></slot>
			</div>
			<div class="popup-body">
				<slot></slot>
			</div>
			<div class="popup-footer">
				<slot name="footer"></slot>
			</div>
		</div>
	</span>
{/if}
<style>
	.shadow{
		position:fixed;
		left:0;
		top:0;
		width:100vw;
		height:100vh;
		z-index:990;
		background:rgba(0,0,0,0.6);
		cursor:pointer;
	}
	.card{
		position:fixed;
		left:0;
		right:0;
		top:0;
		bottom:0;
		margin:auto;
		display:block;
		width:50%;
		min-width:200px;
		min-height:200px;
		max-height:50%;
		background:white;
		z-index:992;
	}
	.popup-title{
		display:flex;
		background:var(--base-gray1);
		height:2em;
		width:100%;
		font-weight:600;
		vertical-align: middle;
	}
	.popup-body{
		overflow:auto;
		width:100%;
		height:calc(100% - 5em);
	}
	.popup-footer{
		display:flex;
		bottom:0;
		width:100%;
		height:3em;
	}
	@media (max-width: 720px) {
		.card{
			width:100%;
		}
	}
</style>