/**
 * アカウント情報一式を制御するクラス
 * ログイン処理
 * 設定jsonの管理
 * ログアウト
 */
import { supabase } from '$lib/supabase.js'
export class AccountClass{
	constructor(){
		this.authSubscription=null
		this.mem={
			stateLogin:'SIGNED_OUT'
		}
	}
	/**
	 * サインイン
	 * @param {*} loginId 
	 * @param {*} password 
	 * return {ok:true or false,message:string}
	 */
	async login(loginId,password){
		const { error } = await supabase.auth.signInWithPassword(
			{
				email: loginId,
  			password: password
			}
		)
		if (error) {
			return {ok:false,message:error.message}
		}
		return {ok:true,message:''}
	}
	
	/**
	 * ログインチェック
	 * return　true or false
	 */
	async checkLogin(){
		const { data: { session } } = await supabase.auth.getSession()
		if (session) {
				return true
		}
		return false
	}

	/**
	 * サインインしているかチェック
	 * logoutAction:function
	 */
	async watchLoginState(logoutAction){
		return new Promise(()=>{
			this.authSubscription = supabase.auth.onAuthStateChange((event, session) => {
					this.mem.stateLogin=event
					console.log(event)
					if (event === 'SIGNED_OUT' || !session) {
							logoutAction()
					}
			})
		})
	}

	/**
	 * ログアウト
	 */
	logout(){
		supabase.auth.signOut()
	}
	/**
	 * 
	 */
	unsubscribe(){
		if (this.authSubscription && typeof this.authSubscription.unsubscribe === 'function') {
				this.authSubscription.unsubscribe()
		}
	}
	/**
	 * ログイン状態を取得
	 */
	get stateLogin(){
		return this.mem.stateLogin
	}
}