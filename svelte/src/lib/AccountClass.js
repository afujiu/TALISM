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
	 * @param {{select?:string,where?:string|null,orderBy?:string|{column:string,ascending?:boolean}|null,fromIndex?:number|null,count?:number|null,countOnly?:boolean}} options
	 * return {ok:true or false,data:data,message:message}
	 * 
	 * 使用例:
	 * await account.getDb('products', {where: "quantity > 0 and category = '模型'"})
	 * await account.getDb('products', {where: "category in ('模型', '工具')"})
	 * await account.getDb('products', {where: "name like '%ミニ%'"})
	 * await account.getDb('products', {
	 *   select: 'id,name,quantity',
	 *   where: "quantity > 0 or category = '工具'",
	 *   orderBy: {column: 'name', ascending: true},
	 *   fromIndex: 0,
	 *   count: 20
	 * })
	 */
	async getDb(from,{select='*',where=null,orderBy=null,fromIndex=null,count=null,countOnly=false}={}){
		/** @type {any} */
		let query = countOnly
			? supabase.from(from).select(select, {count:'exact',head:true})
			: supabase.from(from).select(select)

		if (where) {
			where = where.replace(/\\/g, '\\\\')
			const tokens = []
			let start = 0
			let quote = false
			for (let index = 0; index < where.length; index += 1) {
				if (where[index] === "'") quote = !quote
				if (!quote && /\s/.test(where[index])) {
					const logical = where.slice(index).match(/^\s+(and|or)\s+/i)
					if (logical) {
						tokens.push({type:'condition',value:where.slice(start, index).trim()})
						tokens.push({type:'logical',value:logical[1].toLowerCase()})
						index += logical[0].length - 1
						start = index + 1
					}
				}
			}
			tokens.push({type:'condition',value:where.slice(start).trim()})

			/** @param {string} expression */
			const parseCondition = (expression) => {
				const match = expression.match(/^([a-zA-Z_][\w]*)\s*(=|>|<|\bin\b|\blike\b)\s*(.+)$/i)
				if (!match) throw new Error(`whereの条件が不正です: ${expression}`)
				const [, column, operator, rawValue] = match
				/** @param {string} item */
				const parseValue = (item) => {
					const value = item.trim()
					if (/^null$/i.test(value)) return null
					if (/^'.*'$/.test(value)) return value.slice(1, -1).replace(/''/g, "'")
					if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value)
					throw new Error(`whereの値が不正です: ${value}`)
				}
				if (operator.toLowerCase() === 'in') {
					if (!/^\(.*\)$/.test(rawValue.trim())) throw new Error(`inの値が不正です: ${rawValue}`)
					return {column,operator:'in',values:rawValue.trim().slice(1,-1).split(',').map(parseValue)}
				}
				if (operator.toLowerCase() === 'like') {
					return {column,operator:'like',value:parseValue(rawValue)}
				}
				return {column,operator,value:parseValue(rawValue)}
			}

			const conditions = tokens.filter((token) => token.type === 'condition').map((token) => parseCondition(token.value))
			const logicals = tokens.filter((token) => token.type === 'logical').map((token) => token.value)
			/** @param {any} condition */
			const toPostgrest = (condition) => {
				/** @param {any} value */
				const format = (value) => typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : String(value)
				if (condition.operator === 'in') return `${condition.column}.in.(${condition.values.map(format).join(',')})`
				if (condition.operator === 'like') return `${condition.column}.like.${format(condition.value)}`
				return `${condition.column}.${condition.operator === '=' ? 'eq' : condition.operator === '>' ? 'gt' : 'lt'}.${format(condition.value)}`
			}
			/** @param {any} condition */
			const applyCondition = (condition) => {
				if (condition.operator === '=') query = query.eq(condition.column, condition.value)
				if (condition.operator === '>') query = query.gt(condition.column, condition.value)
				if (condition.operator === '<') query = query.lt(condition.column, condition.value)
				if (condition.operator === 'in') query = query.in(condition.column, condition.values)
				if (condition.operator === 'like') query = query.like(condition.column, condition.value)
			}

			let group = [conditions[0]]
			for (let index = 0; index < logicals.length; index += 1) {
				if (logicals[index] === 'and') {
					if (group.length === 1) applyCondition(group[0])
					else query = query.or(group.map(toPostgrest).join(','))
					group = [conditions[index + 1]]
				} else {
					group.push(conditions[index + 1])
				}
			}
			if (group.length > 0) {
				if (group.length === 1) applyCondition(group[0])
				else query = query.or(group.map(toPostgrest).join(','))
			}
		}

		if (orderBy) {
			if (typeof orderBy === 'string') {
				query = query.order(orderBy, { ascending: true })
			} else if (typeof orderBy === 'object' && orderBy.column) {
				query = query.order(orderBy.column, {
					ascending: orderBy.ascending !== false
				})
			}
		}

		if (!countOnly && fromIndex !== null && count !== null) {
			const start = Math.max(0, Math.floor(Number(fromIndex)))
			const length = Math.max(0, Math.floor(Number(count)))
			if (Number.isFinite(start) && Number.isFinite(length)) {
				query = query.range(start, start + length - 1)
			}
		}
		const { data, count: totalCount, error } = await query
		if (error) {
				console.error(error.message)
				return {ok:false,data:null,message:error.message}
		}
		return {ok:true,data:countOnly ? totalCount : data,message:''}
	}

	/**
	 * 検索したデータの件数を取得
	 * @param {*} from
	 * @param {{select?:string,where?:string|null}} options
	 * @returns {Promise<{ok:boolean,data:number|null,message:string}>}
	 */
	async getDbCount(from,{select='*',where=null}={}){
		return await this.getDb(from, {select, where, countOnly:true})
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
	 * DBにデータ登録+修正
	 * @param {*} from 
	 * @param {*} insertData 
	 * return {ok:true or false,data:data,message:message}
	 */
	async upsertDb(from,insertData,onConflict=''){
		const { data, error } = await supabase
    .from(from)
    .upsert(insertData, {
    	onConflict: onConflict
    })
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