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
			stateLogin:'SIGNED_OUT',
			settings:{},
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
		const { data, error } = await supabase.from(from).select(select)
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

	/**
	 * 設定をデータベースから取得してセット
	 * @param {*} settings 
	 */
	setSettings(srgSettings){
		let settings ={}
		for(let setting of srgSettings){
			settings[setting.key] = {name:setting.name,value:setting.value}
		}
		this.mem.settings = settings
	}

	/***cloudflareのAPI処理 *******
	 * ***************************
	*/

	/**
	 * mode:cvapi
	 */

	/**
	 * kv取得
	 */
	async getKvText(id,key){
		try{
			const settingResult = this.mem.settings[id]
			if(settingResult==undefined){
				return null
			}
			const setting = settingResult.value
			if (setting.url==''){
				throw new Error('Worker URL is not set')
			}
			const url = `${setting.url}?key=${encodeURIComponent(key)}`
			const options = { method: 'GET', headers: {Accept: 'application/json','x-api-key':setting.apikey }
			}
			const res = await fetch(url, options)
			const text = await res.text()
			let body = text 
			if (!res.ok) {
				const err = (body && body.error) ? body.error : res.statusText || 'Request failed'
				throw new Error(err)
			}
			let bodyObj = JSON.parse(body)
			if(!bodyObj.success){
				return null
			}
			return bodyObj.value
		}catch(e){
			return null
		}
	}
	/**
	 * Kv登録
	 */
	async postKvText(id,key,data){
		try{
			const settingResult = this.mem.settings[id]
			if(settingResult==undefined){
				return null
			}
			const setting = settingResult.value

			if (setting.url==''){
				throw new Error('Worker URL is not set')
			}
			const url = `${setting.url}?key=${encodeURIComponent(key)}`
			const options = {
				method: 'POST',
				headers: {Accept: 'application/json','x-api-key':setting.apikey },
				body:data
			}
			const res = await fetch(url, options)
			const text = await res.text()
			if (!res.ok) {
				const err = (body && body.error) ? body.error : res.statusText || 'Request failed'
				throw new Error(err)
			}
			return true
		}catch(e){
			return false
		}
	}
	/**
	 * メディアのbase64情報を取得
	 * @param {*} id 
	 * @param {*} filename 
	 * @returns 
	 */
	async getMediaBase64(id,filename){
		try{
			const settingResult = this.mem.settings[id]
			if(settingResult==undefined){
				return null
			}
			const setting = settingResult.value

			if (setting.url==''){
				throw new Error('Worker URL is not set')
			}
			const url = `${setting.url}?filename=${encodeURIComponent(filename)}`
			const options = { method: 'GET', headers: {'x-api-key':setting.apikey }
			}
			const res = await fetch(url, options)
			if (!res.ok) {
				const body = await res.text()
				const err = (body && body.error) ? body.error : res.statusText || 'Request failed'
				console.log(err)
				return null
			}
			const arrayBuffer = await res.arrayBuffer()
			const bytes = new Uint8Array(arrayBuffer)
			let binary = ''
			const chunkSize = 0x8000
			for (let i = 0; i < bytes.length; i += chunkSize) {
				const chunk = bytes.subarray(i, i + chunkSize)
				binary += String.fromCharCode.apply(null, chunk)
			}
			const base64 = btoa(binary)
			const contentType = res.headers.get('Content-Type') || (filename.includes('.') ? `application/${filename.split('.').pop()}` : 'application/octet-stream')
			return `data:${contentType};base64,${base64}`
		}catch(e){
			return null
		}
	}
	/**
	 * メディア登録(upsert)
	 * @param {*} id 
	 * @param {*} name 
	 * @param {*} base64 
	 * return url
	 */
	async postMedia(id,name,base64){
		try{
			const settingResult = this.mem.settings[id]
			if(settingResult==undefined){
				return null
			}
			const setting = settingResult.value

			if (setting.url==''){
				throw new Error('Worker URL is not set')
			}
			// Base64 データURL を バイナリに変換
			const [meta, data] = base64.split(',');
			const mimeMatch = meta.match(/data:(.*?);base64/);
			const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
			const extension = mimeType.split('/')[1] || 'bin';
			const fileName = name.includes('.') ? name : `${name}.${extension}`;
			const binaryString = atob(data);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			const formData = new FormData()
			formData.append('file', new Blob([bytes], { type: mimeType }), fileName)
			const res = await fetch(setting.url, {
				method: 'POST',
				headers:{'x-api-key':setting.apikey},
				body: formData
			})
			
			const result = await res.json()
			if (!res.ok) {
				throw new Error(result.error || 'Upload failed')
			}
			return result
		}catch(e){
			return null
		}
	}
	/**
	 * メディア削除
	 * @param {*} id 
	 * @param {*} key 
	 */
	async deleteMedia(id,key){
	try{
		const settingResult = this.mem.settings[id]
		if(settingResult==undefined){
			return null
		}
		const setting = settingResult.value

		if (setting.url==''){
			throw new Error('Worker URL is not set')
		}
		const dataUrl = `${setting.url}?filename=${encodeURIComponent(key)}`
		const res = await fetch(dataUrl, {
			method: 'DELETE',
			headers:{'x-api-key':setting.apikey}
		})
		
		const result = await res.json()
		if (!res.ok) {
			throw new Error(result.error || 'Upload failed')
		}
		return result

		}catch(e){

		}
	}
//#endregion
	/**
	 * OCR
	 * @param {*} img 
	 * @returns 
	 */
	async scanOcr(img){
		return await this.ocr.predict(img)
	}

	/**
	 * kv取得
	 */
	async getJancode(id,jancode){
		try{
			const settingResult = this.mem.settings[id]
			if(settingResult==undefined){
				return null
			}
			const setting = settingResult.value
			
			if (setting.url==''){
				throw new Error('Worker URL is not set')
			}
			const url = `${setting.url}?key=${encodeURIComponent(jancode)}`
			const options = { method: 'GET', headers: {Accept: 'application/json','x-api-key':setting.apikey }
			}
			const res = await fetch(url, options)
			const text = await res.text()
			let body = text 
			if (!res.ok) {
				const err = (body && body.error) ? body.error : res.statusText || 'Request failed'
				throw new Error(err)
			}
			let bodyObj = JSON.parse(body)
			return bodyObj.hits
		}catch(e){
			return null
		}
	}

}