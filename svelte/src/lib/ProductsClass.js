import { account, ui } from "$lib/store"
import { get } from 'svelte/store'
/**
 * 商品管理クラス
 */
export class ProductsClass{


	static apiJancodeQueue = Promise.resolve()
	static lastApiJancodeRequestAt = 0
  static get categoryList(){
		return [
		"すべての商品",
		"ミニ四駆関連",
		"ミニ四駆関連\\ミニ四駆本体",
		"ミニ四駆関連\\パーツ",
		"ミニ四駆関連\\キットボーイ・オリジナルグッズ",
		"ミニ四駆関連\\タミヤ製品以外ミニ四駆パーツ",
		"模型",
		"模型\\航空機",
		"模型\\金属模型",
		"模型\\自動車/レーシングカー",
		"模型\\艦船",
		"模型\\風景/ジオラマ",
		"模型\\鉄道/列車",
		"模型\\ガンプラ",
		"模型\\30MM",
		"模型\\メカ/ロボット",
		"模型\\キャラクター",
		"模型\\ミリタリーミニチュア",
		"模型\\バイク",
		"RC",
		"RC\\パーツ/アクセサリ",
		"エアガン",
		"エアガン\\パーツ/アクセサリ",
		"エアガン\\パーツ/アクセサリ\\レイル/マウント",
		"エアガン\\パーツ/アクセサリ\\ハンドガード",
		"エアガン\\パーツ/アクセサリ\\バレル",
		"エアガン\\パーツ/アクセサリ\\グリップ/ストック",
		"エアガン\\パーツ/アクセサリ\\スリング",
		"エアガン\\パーツ/アクセサリ\\サイレンサー/マズル",
		"エアガン\\パーツ/アクセサリ\\サイト/スコープ",
		"エアガン\\パーツ/アクセサリ\\バッテリー関連",
		"エアガン\\パーツ/アクセサリ\\フレーム/スライド",
		"エアガン\\パーツ/アクセサリ\\マガジン",
		"エアガン\\パーツ/アクセサリ\\ライト/レーザー",
		"エアガン\\パーツ/アクセサリ\\その他",
		"エアガン\\パーツ/アクセサリ\\内部パーツ",
		"エアガン\\カスタム電動ガン",
		"エアガン\\キットボーイ・オリジナル",
		"エアガン\\サプライ/消耗品",
		"ツール\\塗料",
		"ツール\\接着剤",
		"ツール\\筆",
		"ツール\\工具",
		"ツール\\材料",
		"その他"
		]
	}

	/**
	 * apiからjancode取得する。(2.5秒間隔でリクエストを実施する)
	 * @param {string} jancode
	 * @returns {Promise<unknown>}
	 */
	static async getApiJancode(jancode){
		const request = this.apiJancodeQueue.then(async () => {
			const interval = 2500
			const elapsed = Date.now() - this.lastApiJancodeRequestAt
			const wait = Math.max(0, interval - elapsed)
			if (wait > 0) {
				await new Promise((resolve) => setTimeout(resolve, wait))
			}
			this.lastApiJancodeRequestAt = Date.now()
			return get(account).getJancode('cf_api_jancode', jancode)
		})
		this.apiJancodeQueue = request.then(() => undefined, () => undefined)
		return request
	}
	/**
	 * yahooAPIから名称から不要単語を置換
	 * @param {*} name 
	 */
	static replaceName(name){
		const removeWords = [
			'「プラモデル」',
			'「同梱不可」',
			'爆買',
			'返品種別B',
			'《発売済・在庫品》',
			'[BANDAI SPIRITS]',
			'《在庫切れ》',
			'送料無料',
			'（再販）',
			'(プラモデル)',
		]
		return removeWords.reduce((result, word) => result.replaceAll(word, ''), String(name ?? ''))
			.replace(/\s+/g, ' ')
			.trim()
	}
	/**
	 * JANコードから商品名取得
	 */
	static async getProductName(jancode){
		let name=''
		//DB(products)からデータ取得
		const dbResult = await get(account).getDb('products',{where:`jancode=${jancode}`})
		if(dbResult.ok){
			if(dbResult.data.length>0){
				name = dbResult.data[0].name
			}
		}
		//APIからproductsデータを取得
		if(name==''){
			const apiResult = await ProductsClass.getApiJancode(jancode)
			name = apiResult[0].name
		}
		return ProductsClass.replaceName(name)
	}
}