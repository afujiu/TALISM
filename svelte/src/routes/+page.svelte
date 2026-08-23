<!-------------------------------
ログイン画面
--------------------------------->
<script>
    import { onMount } from 'svelte'
    import { goto } from '$app/navigation'
		import { account,ui } from '$lib/store'

    let email = ''
    let password = ''
    let errorMessage = ''
    let loading = false

    onMount(async () => {
			$account.unsubscribe()
			if(await $account.checkLogin()){
				await goto('/main')
			}
    })
		/**
		 * ログイン
		 */
    async function login() {
			const result = await $account.login(email,password)
			if(result.ok){
				await goto('/main')
			}else{
				errorMessage = result.message
			}
    }
</script>
<div class="login">
		
    <h1>TALISM ログイン</h1>
    <form
			on:submit={(e) => {
				e.preventDefault()
				login()
			}}
    >
        <div>
            <label for="email">メールアドレス</label>
            <input
                id="email"
                type="email"
                bind:value={email}
                autocomplete="email"
                required
            />
        </div>

        <div>
            <label for="password">パスワード</label>
            <input
                id="password"
                type="password"
                bind:value={password}
                autocomplete="current-password"
                required
            />
        </div>

        {#if errorMessage}
            <p class="error">{errorMessage}</p>
        {/if}

        <button type="submit" disabled={loading}>
            {loading ? 'ログイン中...' : 'ログイン'}
        </button>
    </form>
</div>

<style>
    .login {
        width: 320px;
        margin: 100px auto;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    label {
        display: block;
        margin-bottom: 5px;
    }

    input {
        box-sizing: border-box;
        width: 100%;
        padding: 10px;
    }

    button {
        padding: 10px;
    }

    .error {
        color: red;
    }
</style>