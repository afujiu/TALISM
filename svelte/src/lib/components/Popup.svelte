<script>
	import { onMount,createEventDispatcher } from "svelte"
	import Icon from "$comp/Icon.svelte"
	const dispatch = createEventDispatcher()
	/*******************
	 * argument
	*/
	let {value=false,width='50%',height='50%',closeBtn=true} = $props()
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
		<div class="card" style="width:{width};height:{height}">
			<div class="popup-title">
				<span><slot name="title"></slot>
				{#if closeBtn}
					<button class="popup-close-btn icon"
						onclick={()=>{close()}}
					><Icon value="close"></Icon></button>
				{/if}
				</span>
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
		z-index:998!important;
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
		min-height:200px;
		background:var(--main1);
		z-index:999!important;
	}
	.popup-title{
		display:flex;
		background:var(--base1);
		vertical-align: middle;
		padding-top:0.2em;
		height:2em;
		width:100%;
		font-weight:600;
	}
	.popup-title span{
		padding-left:0.5em;
	}
	.popup-close-btn{
		position:absolute;
		right:0;
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