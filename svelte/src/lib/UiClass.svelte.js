import { page } from '$app/state';
/**
 * 共通のUI操作関連のクラス
 */
export class UiClass{
	constructor(){
		this.mem=$state({
			settings:[],
			menuList:[],
			showNotification:false,
			notificationList:[],
			isOpenMenu:false,
			menuEditFunc:null
		})
	}
	get selectedMenuName(){
		const pathname = page.url.pathname
		let path = pathname.replace("/main/", "")
		path = path.replace("/main", "")
		//固定メニュー
		if(path=='account'){
			return 'アカウント設定'
		}
		const menu=this.mem.menuList.find(v=>v.key == path)
		if(menu==undefined){
			return null
		}
		return `【${menu.category}】${menu.name}`
	}
	get isOpenMenu(){
		return this.mem.isOpenMenu
	}
	set isOpenMenu(isOpenMenu){
		this.mem.isOpenMenu=isOpenMenu
	}

	get showCategoryMenuList(){
		let menu = []
		const categoryList = this.mem.settings['category'].value
		for(let  category of categoryList){
			const oneCategoryMenu = this.mem.menuList.filter(v=>v.category==category)
			console.log(this.mem.menuList)
			if(oneCategoryMenu.length>0){
				menu.push({name:category,menu:oneCategoryMenu})
			}
			
		}
		return menu
	}
	/**
	 * 設定をデータベースから取得してセット
	 * @param {*} settings 
	 */
	setSettings(srgSettings,menuList){
		console.log(menuList)
		let settings ={}
		for(let setting of srgSettings){
			settings[setting.key] = {name:setting.name,value:setting.value}
		}
		this.mem.settings = settings
		this.mem.menuList = menuList
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