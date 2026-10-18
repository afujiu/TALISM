import Dexie from 'dexie'
/**
 * dexie制御クラス
 */
export class DexieClass{
	constructor(storeName) {
		this.storeName = storeName
		this._columns = null
		this._dexie = new Dexie(storeName)
	}
	/**
	 * @param {*} columns []
	 */
	init(columns){
		this._columns = columns
		const storeData = {}
		storeData[this.storeName] = this._columns.join(',')
		this._dexie.version(1).stores(storeData)
	}

	get uid(){
		const time = new Date()
		const minSec=time.getTime()
		const rand = Math.floor(Math.random() * 100000000000)
		return minSec.toString(36)+"-"+rand.toString(36)
	}

	/**
	 * データ保存
	 * @param {*} datas 
	 * @returns 
	 */
	put(datas){
		return new Promise(resolve=>{
				this._dexie[this.storeName].bulkPut(JSON.parse(JSON.stringify(datas)) )
				.then(async (res) => {
						await this.get(res)
						resolve(datas)
				})
				.catch((error) => {
						resolve(null)
				})
		})
	}

	/**
	 * 1件取得
	 * @param {*} primaryKey 
	 * @returns 
	 */
	async get(primaryKey){
		if(this._columns==null){
				return []
		}
		return await this._dexie[this.storeName].get(primaryKey)
	}
	/**
	 * データ件数
	 * @returns 
	 */
	async count(){
		return await this._dexie[this.storeName].count()
	}
	
	/**
	 * データ取得
	 * @param {Record<string, 'asc' | 'desc'> | null} order 並び替え項目と方向（例: {jancode: 'asc'}）
	 * @returns {Promise<Array>}
	 */
	async getAll (order=null){
		if(this._columns==null){
			return []
		}
		const table = this._dexie[this.storeName]
		if (order == null) return await table.toArray()

		const entries = Object.entries(order)
		const [key, direction] = entries[0] ?? []
		if (entries.length !== 1 || !key || (direction !== 'asc' && direction !== 'desc')) {
			throw new TypeError("並び替えは {項目名: 'asc' | 'desc'} の形式で指定してください")
		}

		const collection = table.orderBy(key)
		return await (direction === 'desc' ? collection.reverse() : collection).toArray()
	}
	/**
	 * テーブルそのものを取得
	 */
	get table(){
		return this._dexie[this.storeName]
	}
	/**
	 * dexieのwhere条件を複数指定する
	 * @param {*} where [{mode:'query',key:'key',value:'value'},{mode:'in',key:'key',value:[1,2,3]}]
	 */
	async getWhere(where) {
			if (!this._columns) return [];
		
			const table = this._dexie[this.storeName];
			let collection;
		
			// ① 最初にインデックスを活用できる条件を適用する
			const indexable = where.find(el =>
				['query', 'anyOf', 'between', 'above', 'below', 'aboveOrEqual', 'belowOrEqual'].includes(el.mode)
			)
			if (indexable) {
				switch (indexable.mode) {
					case 'query':
						collection = table.where(indexable.key).equals(indexable.value);
						break;
					case 'anyOf':
						collection = table.where(indexable.key).anyOf(indexable.value);
						break;
					case 'between':
						collection = table.where(indexable.key)
							.between(indexable.value[0], indexable.value[1]);
						break;
					case 'above':
						collection = table.where(indexable.key).above(indexable.value);
						break;
					case 'below':
						collection = table.where(indexable.key).below(indexable.value);
						break;
					case 'aboveOrEqual':
						collection = table.where(indexable.key).aboveOrEqual(indexable.value);
						break;
					case 'belowOrEqual':
						collection = table.where(indexable.key).belowOrEqual(indexable.value);
						break;
					default:
						collection = table.toCollection();
				}
			} else {
				collection = table.toCollection();
			}
		
			// ② 残りの条件を and()/filter() で順次適用
			where.forEach(el => {
				if (el === indexable) return;
		
				switch (el.mode) {
					case 'notEqual':
						collection = collection.and(item => item[el.key] !== el.value);
						break;
					case 'contains':
						collection = collection.and(item =>
							String(item[el.key]).includes(el.value)
						);
						break;
					case 'startsWith':
						collection = collection.and(item =>
							String(item[el.key]).startsWith(el.value)
						);
						break;
					case 'endsWith':
						collection = collection.and(item =>
							String(item[el.key]).endsWith(el.value)
						);
						break;
					case 'notIn':
						collection = collection.and(item =>
							!el.value.includes(item[el.key])
						);
						break;
					case 'notBetween':
						const [min, max] = el.value;
						collection = collection.and(item =>
							item[el.key] < min || item[el.key] > max
						);
						break;
					// ほかの条件：必要に応じて追加
					default:
						break;
				}
			});
		
			// コレクション結果を取得
			return await collection.toArray();
		}
	/**
	 * 削除
	 */
	async delete(primaryKey){
		if(this._columns==null){
				return []
		}
		await this._dexie[this.storeName].delete(primaryKey)
		return await this.getAll()
	}

	/**
	 * 
	 * @returns 条件付き削除
	 */
	async deleteWhere(key,val){
		if(this._columns==null){
			return []
		}
		await this._dexie[this.storeName].where(key).equals(val).delete()
		return await this.getAll()
	}

	/**
	 * レコードクリア
	 */
	async deleteStore(){
			await this._dexie[this.storeName].clear()
	}
}