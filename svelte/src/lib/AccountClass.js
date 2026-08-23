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

	/**
	 * DBからデータ取得
	 * @param {*} from 
	 * @param {*} where 
	 * return {ok:true or false,data:data,message:message}
	 */
	async getDb(from,select='*'){
		const { data, error } = await supabase
				.from(from)
				.select(select)
		if (error) {
				console.error(error.message)
				return {ok:false,data:null,message:error.message}
		}
		return {ok:true,data:data,message:''}
	}

	/**
	 * DBにデータ登録
	 * @param {*} from 
	 * @param {*} insertData 
	 * return {ok:true or false,data:data,message:message}
	 */
	async insertDb(from,insertData){
		const { data, error } = await supabase
    .from(from)
    .insert(insertData)
		if (error) {
				return {ok:false,data:null,message:error.message}
		} else {
				return {ok:true,data:data,message:'登録成功'}
		}
	}

	/**
	 * DBのデータ更新
	 * @param {*} from
	 * @param {*} updateData
	 * @param {*} where {column: value} または {column1: value1, column2: value2}
	 * return {ok:true or false,data:data,message:message}
	 */
	async updateDb(from,updateData,where={}){
		if (!from || !updateData || typeof updateData !== 'object') {
			return {ok:false,data:null,message:'from and updateData are required'}
		}

		let query = supabase
			.from(from)
			.update(updateData)

		if (where && typeof where === 'object' && Object.keys(where).length > 0) {
			const entries = Object.entries(where)
			if (entries.length === 1) {
				const [key, value] = entries[0]
				query = query.eq(key, value)
			} else {
				query = query.match(where)
			}
		}

		const { data, error } = await query
		if (error) {
			return {ok:false,data:null,message:error.message}
		}
		return {ok:true,data:data,message:'更新成功'}
	}
	
	/**
	 * データを削除
	 * @param {*} from
	 * @param {*} where {column: value} または {column1: value1, column2: value2}
	 * return {ok:true or false,data:data,message:message}
	 */
	async deleteDb(from,where={}){
		if (!from) {
			return {ok:false,data:null,message:'from is required'}
		}

		let query = supabase
			.from(from)
			.delete()

		if (where && typeof where === 'object' && Object.keys(where).length > 0) {
			const entries = Object.entries(where)
			if (entries.length === 1) {
				const [key, value] = entries[0]
				query = query.eq(key, value)
			} else {
				query = query.match(where)
			}
		}

		const { data, error } = await query
		if (error) {
			return {ok:false,data:null,message:error.message}
		}
		return {ok:true,data:data,message:'削除成功'}
	}
}