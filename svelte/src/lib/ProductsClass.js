import { get } from 'svelte/store'
import { account, ui } from "$lib/store"
import { DexieClass } from '$lib/DexieClass.js'
/**
 * 商品管理クラス
 */
export class ProductsClass{
	constructor(){
		//商品一覧
		this.localProducts = new DexieClass('localProducts')
	}
	
	/**
	 * 商品一覧取得
	 */
	static async getProductList(){
		let list=[]
		const MAX_ONE_PAGE_ROW=1000
		const countResult = await get(account).getDbCount('products')
		if(countResult.ok&&countResult.data!=null){
			for(let i=0;i<countResult.data;i+=MAX_ONE_PAGE_ROW){
				const result = await get(account).getDb('products',{fromIndex:i,count:MAX_ONE_PAGE_ROW})
				if(result.ok){
					list=[...list,...result.data]
				}
			}
		}
		return list
	}

	/**
	 * ローカルの商品情報取得
	 * @param {*} jancode 
	 */
	async getProducts(jancode){
		return await this.localProducts.getWhere([{mode:'query',key:'jancode',value:jancode}])
	}

	/**
	 * 商品DBの項目
	 */
	static get productColumns(){
		return [
			{ key: "id", name: "Id" },
			{ key: "created_at", name: "登録日時" },
			{ key: "update_at", name: "更新日時" },
			{ key: "jancode", name: "JANコード" },
			{ key: "maker", name: "メーカー" },
			{ key: "seriescode", name: "シリーズコード" },
			{ key: "name", name: "品名" },
			{ key: "brand", name: "ブランド" },		
			{ key: "category", name: "カテゴリ" },
			{ key: "price", name: "単価" },
			{ key: "quantity", name: "数量" },
			{ key: "seo", name: "SEO" },
			{ key: "meta", name: "メタ情報" }, 
  	]
	}
	/**
	 * カテゴリー一覧
	 */
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

//#region staticでjancodeから品名を取得**********************
	static apiJancodeQueue = Promise.resolve()
	static lastApiJancodeRequestAt = 0  

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

	/**
	 * 商品情報取得
	 * @param {*} jancode 
	 * @returns 
	 */
	static async getProductData(jancode){
		let name=''
		let price=0
		let taxprice=0
		let quantity=0
		//DB(products)からデータ取得
		const dbResult = await get(account).getDb('products',{where:`jancode=${jancode}`})
		if(dbResult.ok){
			if(dbResult.data.length>0){
				name = dbResult.data[0].name
				price = dbResult.data[0].price
				taxprice = dbResult.data[0].taxprice
				quantity = dbResult.data[0].quantity
			}
		}
		//APIからproductsデータを取得
		if(name==''){
			const apiResult = await ProductsClass.getApiJancode(jancode)
			name = apiResult[0].name
		}
		return {
			name:ProductsClass.replaceName(name),
			price:price,
			taxprice:taxprice,
			quantity:quantity,
		}
		
	}

	/**
	 * 数量登録
	 * JANコードがない場合は、insert
	 */
	static async updateProductsQuantity(list){
		//登録用データのJANコード一覧によって、すでにDBに登録している商品を取得
		const jancodeList=[]
		const insertOrUpdateList={insert:[],update:[]}
		for(let val of list){
			jancodeList.push(`'${val.jancode}'`)
		}
		const jancodeListStr = jancodeList.join(',')
		const result = await get(account).getDb('products',
			{select:'id,jancode,quantity',where:`jancode in (${jancodeListStr})`}
		)
		let existList=[]
		if(result.ok){
			existList = result.data
		}
		// insert用データとupdate用データを選別
		for(let val of list){
			const existData = existList.find(v=>v.jancode == val.jancode)
			if(existData==undefined){
				insertOrUpdateList.insert.push({
					jancode:val.jancode,
					name:val.name,
					price:val.price,
					taxprice:val.taxprice,
					quantity:Number((val.realQuantity!=undefined?val.realQuantity:val.quantity))
				})
			}else{
				insertOrUpdateList.update.push({
					jancode:val.jancode,
					quantity:Number((val.realQuantity!=undefined?val.realQuantity:val.quantity))+Number(existData.quantity)
				})
			}
		}
		//更新
		await get(account).insertDb('products',insertOrUpdateList.insert)
		await get(account).upsertDb('products',insertOrUpdateList.update,'jancode')
	}
//#endregion


//#region 単体ツール **************************************
	
/**
	 * yahooAPIから名称から不要単語を置換
	 * @param {*} name 
	 */
	static replaceName(name){
		const removeWords = [
			'プラモデル',
			'同梱不可',
			'爆買',
			'返品種別B',
			'発売済・在庫品',
			'BANDAI SPIRITS',
			'在庫切れ',
			'販売終了',
			'送料無料',
			'再販',
			'即納',
			'プラモデル',
			'中古即納',
			'ネコポス複数でも270円 沖縄不可',
			'外箱、底箱つぶれ商品',
			'再販',
			'BANDAI SPIRITS',
			'外箱初期すれ、小傷商品',
			'在庫品',
			'在庫処分品',
			'特価セール',
			'新品',
			'中古',
			'大型冷凍車',
			'お取り寄せ',
			'外箱、底箱つぶれ商品',
			'再生産',
			'メール便選択可',
			'特別販売商品',
			'12個までメール便可',
			'1個までメール便可',
			'１月予約',
			'２月予約',
			'３月予約',
			'４月予約',
			'５月予約',
			'６月予約',
			'７月予約',
			'８月予約',
			'９月予約',
			'１０月予約',
			'１１月予約',
			'１２月予約',
			'全力価格！',
			'ミリタリーミニチュア限定愛蔵版',
		]
		const parentheses = [
			'()',
			'[]',
			'《》',
			'（）',
			'「」',
			'【】',
			'『』',
			'［］',
		]
		name = removeWords.reduce((result, word) => result.replaceAll(word, ''), String(name ?? ''))
			.replace(/\s+/g, ' ')
			.trim()
		name = name.replace(/【[^】]*クーポン[^】]*】/g, '【】');
		name = name.replace(/【[^】]*商品[^】]*】/g, '【】');
		return  name = parentheses.reduce((result, word) => result.replaceAll(word, ''), String(name ?? ''))
		.replace(/\s+/g, ' ')
		.trim()
	}

	static get makerList(){
		return [
			"タミヤ",
			"LayLax",
			"バンダイ",
			"東京マルイ",
			"F.FACTORY",
			"ハセガワ",
			"フジミ",
			"ファイアフライ",
			"フリーダム・アート",
			"KM企画",
			"アオシマ",
			"マイクロエース",
			"イマイ",
			"不明",
			"SⅡS",
			"アリイ",
			"アローダイナミック",
			"アングス",
			"システマ",
			"キットボーイ",
			"エレメント",
			"ドラゴン",
			"ABCホビー",
			"アーテック",
			"accutact",
			"AFVクラブ",
			"AIM SPORTS",
			"Alan",
			"ANGEL",
			"BANDAI SPIRITS",
			"Bushnell",
			"C-MORE",
			"CAW",
			"ENCORE MODELS",
			"EOTech",
			"G&G",
			"G&P",
			"GFORCE",
			"GSIクレオス",
			"ガイアノーツ",
			"HMC",
			"HYUGA",
			"KASSNAR",
			"KSC",
			"LA-GUNSHOP",
			"LEAPERS",
			"LONEX",
			"NcSTAR",
			"NEOX",
			"NINEBALL/ナインボール",
			"NITRO.Vo",
			"NOVEL",
			"OKパーツ",
			"OPTION NO1",
			"ORGA",
			"PDI",
			"SHS",
			"Skirmish",
			"TASCO",
			"TOP",
			"UFC",
			"WA",
			"XCORTECH",
			"ゴッドハンド",
			"アカデミー",
			"イーグル",
			"イーグルフォース",
			"イーグルモデル",
			"イタレリ",
			"ウェーブ",
			"クライタック",
			"クラウン",
			"クラウンモデル",
			"グンゼ",
			"コスモ・エナジー",
			"サイトロンジャパン",
			"ジーフォース",
			"スウィート",
			"スプレッドワールド",
			"スモーキーズ",
			"セキトー",
			"ダイアモンドリング",
			"タスクフォース",
			"タミックス",
			"ディアブロ",
			"トミー",
			"ノーベルアームズ",
			"ハートフォード",
			"ハイテック",
			"パカ山クラフト",
			"パドック",
			"バトラークリーク",
			"ビッグアウト",
			"ピットロード",
			"ヒューガ",
			"ファースト",
			"ファーストファクトリー",
			"ファインモールド",
			"プロゲーマー",
			"プロテック",
			"ホビーベース",
			"ホビーマスター",
			"マルイ",
			"マルサン",
			"マルシン",
			"モケイパドック",
			"桑田商会",
			"玄人の道",
			"童友社",
			"日本模型",
			"スジボリ堂",
			"ウェーブ"
		]
	}

	/**
	 * メーカーの置換
	 * @param {string | null | undefined} maker
	 */
	static replaceMaker(maker){
		const normalizedMaker = String(maker ?? '').trimStart()
		if (/ライラクス|laylax/i.test(normalizedMaker)) return 'LayLax'
		if (/ナインボール|NINEBALL/i.test(normalizedMaker)) return 'NINEBALL/ナインボール'
		if (/ガンダム|バンダイナムコエンターテインメント|bandai|BANDAI/i.test(normalizedMaker)) return 'バンダイ'
		if (normalizedMaker.includes('ミニ四駆')) return 'タミヤ'
		if (/ウェーブ\s*４９４３２０９１１５６３１/.test(normalizedMaker)) return 'ウェーブ'
		if (/ブランド登録なし/i.test(normalizedMaker)) return ''
		return normalizedMaker
	}

//#endregion 
//*******************************************************

}