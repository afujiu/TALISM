<script>
    import { onMount, onDestroy } from 'svelte'
    import { goto } from '$app/navigation'
		import { account,ui } from '$lib/store'
		import { page } from '$app/state'
		let { children } = $props()

		$effect(async() => {
			console.log(page.url.pathname)
			if(!await $account.checkLogin()){
				goto('/login')
				return
			}
		})

		let isLoading=$state(false)
    onMount(async () => {
    	$account.watchLoginState(()=>{
				goto('/login')
				return
			})
			console.log('check')
			isLoading=true
    })

    async function logout() {
        $account.logout()
        await goto('/login')
    }
</script>
<section>
{#if isLoading}
	
		<button onclick={logout}>logout</button>
		{@render children()}
{/if}
</section>