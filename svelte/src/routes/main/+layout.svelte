<!-------------------------------
ヘッダーメニュー一覧
--------------------------------->
<script>
    import { onMount, onDestroy } from 'svelte'
    import { goto } from '$app/navigation'
		import { account,ui } from '$lib/store'
		import { page } from '$app/state'
		import packageJson from '../../../package.json'
		import Format from "$comp/Format.svelte"
		import Icon from '$comp/Icon.svelte'
		let { children } = $props()

		/**
		 * 各ページ遷移時
		*/
		$effect(async() => {
			if(!await $account.checkLogin()){
				goto('/')
				return
			}
		})

		let isLoading=$state(false)

		/**
		 * ログインチェック
		*/
    onMount(async () => {
    	$account.watchLoginState(()=>{
				goto('/')
				return
			})
			const resultMenus = await $account.getDb('menus')
			const resultSettings = await $account.getDb('settings')
			if(resultMenus.ok&&resultSettings.ok){
				$account.setSettings(resultSettings.data)
				$ui.setSettings(resultSettings.data,resultMenus.data)
			}else{
				goto('/')
				return 
			}
			isLoading=true
    })

		function move(path){
			if($ui.isMobileSize){
				$ui.isOpenMenu=false
			}
			goto(path)
		}
</script>
<!-- ヘッダー -->
	<header>
		<div class="left">
			<button class="icon"
				onclick={()=>{ $ui.isOpenMenu =!$ui.isOpenMenu }}
			><Icon value='menu'></Icon></button>
			<span>{$ui.selectedMenuName}</span>
		</div>
		<div class="right">
			<button class="icon" onclick={()=>{$ui.notification=!$ui.notification}}>	<Icon value='notifications'></Icon></button>
		</div>
	</header>
<!-- メニュー -->
	<nav class="{$ui.isOpenMenu?'active':''}">
	{#if isLoading}
		<div class="menu-block">
			{#each $ui.showCategoryMenuList as category}
				<h4>{category.name}</h4>
				<div>
					{#each category.menu as menu}
						<a class="menu-link" onclick={()=>{ move(`/main/${menu.key}`)}}
							style="{$ui.selectedMenuKey==menu.key?'font-weight: bold;':''}"
						>{menu.name}</a>
					{/each}
				</div>
			{/each}
	</div>
	{/if}
	<div class="account-setting">
		<button
			onclick={()=>{move('/main/account')}}
		><Icon value="settings"></Icon>
			<span>アカウント</span>
		</button>
	</div>
	</nav>
<!-- メイン　-->
	<section class="{$ui.isOpenMenu?'active':''}">
		{#if isLoading}
			{@render children()}
		{/if}
		{#if $ui.isOpenMenu}
			<div class="xs-shadow"
				onclick={()=>{$ui.isOpenMenu=false}}></div>
		{/if}
	</section>
<!-- フッター -->
	<footer>
		<span>TALISM　v{packageJson.version}</span>
	</footer>
	<!--通知リスト-->
	{#if $ui.notification}
		<div id="notificationCard" class="notification-card">
			{#each [...$ui.notificationList].sort((a, b) => (b.time ?? 0) - (a.time ?? 0)) as data}
				<div style="display:flex;">
						<span class="f1">
						<!--処理完了時-->
						{#if data.isProgress}
							{data.text}
						{:else}
							<a href={data.url} class={data.isProgress?'notification-a-link':''}>
								{data.text}
							</a>
						{/if}
						</span>
						<span class="f1 text-right" style="justify-content:right;">
							<Format value={data.time} type="time"></Format>
						</span>
				</div>
				<div style="font-size:0.8em;" class={data.status?'notification-a-link':'red-color'}>
					{@html data.message}
				</div>
			{/each}
		</div>
	{/if}

<style lang="scss">
	:root {
		--header-height:2em;
		--footer-height:1.2em;
		--app-height: 100dvh;
		--nav-width:15em;
		--xs-nav-width:80%;
	}

	header {
		display:flex;
		gap: 10px;
		position:absolute;
		left:0;
		top:0;
		height:var(--header-height);
		width:100%;
		background:var(--base1);
	}
	header .left{
		flex:1;
		height:100%;
	}
	header .left span{
		display:inline-block;
		position:absolute;
		height:100%;
		top:0;
		bottom:0;
		vertical-align: middle;
		margin:0;
	}
	header .right{
		flex:1;
		justify-content: flex-end;
		text-align:right;
	}

	nav{
		position:absolute;
		top:var(--header-height);
		left:calc(var(--nav-width) * (-1));
		width:var(--nav-width);
		height:calc(100% - var(--header-height) - var(--footer-height));
		z-index:900;
		overflow:hidden;
		background:var(--base1);
	}

	nav.active{
		left:0;
	}

	nav .menu-block{
		width:100%;
		height:calc(100% - 2em);
		padding-left:1em;
		overflow:auto;
	}

	nav .account-setting{
		height:10%;
	}
	nav .account-setting *{
		background:transparent;
	}
	nav .account-setting button{
		display:flex;
		align-items: center;
		padding:0;
		margin:1px;
		width:99%;
		position:absolute;
		left:0;
		bottom:0px;
		height:2em;
		border:none;
	}
	nav h4{
		padding:0;
		margin:0;
		margin-top:0.5em;
		margin-bottom:0.5em;
	}
	nav a{
		display:block;
		padding:0;
		margin:0;
		margin-top:1em;
		margin-bottom:1em;
		color:var(--confirm);
		cursor:pointer;
	}

	section{
		position:absolute;
		left:0em;
		top:var(--header-height);
		right:0;
		width:100%;
		height:calc(100% - var(--header-height) - var(--footer-height));
		overflow:hidden;
		z-index:500;
		background:var(--main1);
		white-space: nowrap;
	}

	section.active{
		width:calc(100% - var(--nav-width));
		left:var(--nav-width);
	}

	section .xs-shadow{
		display:none;
		transition: opacity 2s ease;
	}

	footer{
		vertical-align: middle;
		position:absolute;
		left:0;
		bottom:0;
		width:100%;
		height:var(--footer-height);
		z-index:900;
		background:var(--base1);
	}

	footer span{
		position:absolute;
		padding-left:1em;
		top:0;
		font-size:0.8em;
	}

/**通知カード**/
.notification-card{
	z-index:950;
	position:absolute;
	top:var(--header-height);
	right:0;
	width:30em;
	min-height:10em;
	max-height:40vh;
	overflow:auto;
	background:white;
	box-shadow: 0px 1px 3px 2px rgba(0,0,0,0.5);
}

/**アイコンボタン**/
button.icon{
	background:transparent;
	border:none;
	cursor: pointer;
}

button{
	cursor: pointer;
	outline: none;
	margin:0;
  user-select: none;
  -webkit-user-select: none;
	-webkit-tap-highlight-color: transparent;
	-webkit-touch-callout: none;
  user-select: none;
  -webkit-user-select: none;
}

button:hover,button:focus{
	box-shadow: 0px 1px 2px 1px black;
	filter: brightness(1.2);
}

button:hover *,button:focus *{
	color:black;
}

button:active{
	color:var(--base2);
  background: linear-gradient(
    90deg,
    #00000099,
		#000000ff,
    #00000099
  );
	box-shadow: inset 0px 0px 4px black; 
}

button:active *{
	color:white;
	opacity:0.3;
}
	/** スマホサイズ **/
	@media (max-width: 767px) {
		nav{
			left:calc(var(--xs-nav-width) * (-1));
			width:var(--xs-nav-width);
		}
		section{
			width:100%;
		}
		section.active{
			left:var(--xs-nav-width);
		}

		section .xs-shadow{
			display:block;
			position:absolute;
			left:0;
			top:0;
			right:0;
			bottom:0;
			background:black;
			opacity:0.7;
			width:100%;
			z-index:700;
		}

		.notification-card{
			width:100%;
		}
	}
</style>