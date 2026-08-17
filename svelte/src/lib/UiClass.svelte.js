import { page } from '$app/state';
/**
 * 共通のUI操作関連のクラス
 */
export class UiClass{
	constructor(){
		this.mem=$state({
			showMenu:false,
			showNotification:false,
			categoryList:['','在庫','HP情報','分析'],
			menuList:[
				{id:'',category:'',name:'ダッシュボード',showMenu:true,mode:'special'},
				{id:'stockList',category:'在庫',name:'一覧',showMenu:true,mode:'list'},
				{id:'stockReceiving',category:'在庫',name:'入庫',showMenu:true,mode:'list'},
				{id:'stockInventory',category:'在庫',name:'棚卸',showMenu:true,mode:'list'},
				{id:'stockSale',category:'在庫',name:'販売',showMenu:true,mode:'list'},
				{id:'hpOriginal',category:'HP情報',name:'オリジナル商品',showMenu:true,mode:'list'},
				{id:'hpUsed',category:'HP情報',name:'中古ガン',showMenu:true,mode:'list'},
				{id:'settings',category:'',name:'ユーザー設定',showMenu:false,mode:'special'},
			],
			notificationList: /** @type {{uuid:string,url:string,text:any,func:()=>Promise<void>}[]} */ ([]),
			menuEditFunc:null
		})
	}
	/**
	 * メニューを表示
	 */
	get showMenu(){
		return this.mem.showMenu
	}
	set showMenu(showMenu){
		this.mem.showMenu = showMenu
	}
	openMenu(){
		this.mem.showMenu=true
	}
	closeMenu(){
		this.mem.showMenu=false
	}

	/**
	 * 通知一覧を表示
	 */
	get notification(){
		return this.mem.notification
	}
	set notification(notification){
		this.mem.notification = notification
	}
	openNotification(){
		this.mem.showNotification = true
	}
	closeNotification(){
		this.mem.showNotification = false
	}

	get menuList(){
		return this.mem.menuList.filter(v=>v.showMenu==true)
	}
	/**
	 * カテゴリー別メニュー
	 */
	get showCategoryMenuList(){
		const resultData  =[]
		for(let category of this.mem.categoryList){
			const menu = this.mem.menuList.filter(v=>v.category==category&&v.showMenu==true)
			if(menu.length>0){
				resultData.push({name:category,menu:menu})
			}
		}
		return resultData
	}

	get categoryList(){
		return this.mem.categoryList
	}

	/**
	 * メニュー名を取得 
	 */
	getSelectedMenu(){
		const pathname = page.url.pathname
		let path = pathname.replace("/p/", "")
		path = path.replace("/p", "")
		path = path.replace("/", "")
		const menu=this.mem.menuList.find(v=>v.id == path)
		if(menu==undefined){
			return null
		}
		return menu
	}
	get selectedMenuName(){
		const menu = this.getSelectedMenu()
		if(menu==null){
			return ''
		}
		if(menu.category==''){
			return menu.name
		}
		return `[${menu.category}]${menu.name}`
	}
	get selectedMenuId(){
		const menu = this.getSelectedMenu()
		if(menu==null){
			return ''
		}
		return menu.id
	}

	/**
	 * ウィンドウサイズをチェック
	 */
	get isMobileSize(){
		const isMobile = window.matchMedia("(max-width: 720px)").matches;
		return isMobile
	}
	/**
	 * 通知追加
	 * @param {*} func 
	 */
	addNotification(text,argFunc){
		const div = document.getElementById('notificationCard')
		if(div){
			div.scrollTop = 0
		}
		
		const uuid = crypto.randomUUID()
		const time = new Date()
		const notification = {
			uuid,
			text:text,
			url:window.location.href,
			time:time,
			message:'',
			status:false,
			isProgress:true,
			func:async()=>{
				const result = await argFunc()
				const obj = this.mem.notificationList.find(v => v.uuid == uuid)
				if(obj!=undefined){
					if(result){
						obj.status = result.status
							this.notification=true
						obj.message = result.message
					}
					obj.isProgress=false
				}
			}
		}
		this.mem.notificationList=[...this.mem.notificationList,notification]
		const obj = this.mem.notificationList.find(v => v.uuid == uuid)
		if(obj!=undefined){
			obj.func()
		}
	}
	/**
	 * 通知リスト
	 */
	get notificationList(){
		return this.mem.notificationList
	}
	/**
	 * 通知リストのresultが一つでもtrueの場合はtrue
	 */
	get isNotification(){
		return this.mem.notificationList.some((v) => v.result === true)
	}

	/**
	 * メニュータイトル部の設定ボタンを押した時の挙動
	 */
	set menuEditFunc(menuEditFunc){
		this.mem.menuEditFunc = menuEditFunc
	}
}