import { page } from '$app/state';
/**
 * 共通のUI操作関連のクラス
 */
export class UiClass{
	constructor(){
		this.mem=$state({
			isOpenMenu:false
		})
	}
	get selectedMenuName(){
		return 'hogehoge'
	}
	get isOpenMenu(){
		return this.mem.isOpenMenu
	}
	set isOpenMenu(isOpenMenu){
		this.mem.isOpenMenu=isOpenMenu
	}

	get showCategoryMenuList(){
		return [
			{name:'在庫管理',menu:[{id:'a',name:'1'},{id:'b',name:'2'}]},
			{name:'中古管理',menu:[{id:'a',name:'1'},{id:'b',name:'2'}]},
		]
	}
}