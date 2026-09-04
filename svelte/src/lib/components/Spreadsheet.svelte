<script module>
	/**
	 * スプレットシートクラス
	 */
	export class SpreadsheetClass {
		constructor() {
			this.headerList = $state([])
			this.list = $state([])
			this.dropIdx = 0
			this.copiedData=null
			this.sortKeys = $state([])
			this.filterList = $state({})
		}
		/**
		 * ヘッダー初期化
		 * @param headerList
		 */
		init(headerList){
			for(let idx in headerList){
				if(headerList[idx]['width']==null){
					headerList[idx]['width']=100
				}
				if(headerList[idx]['required']==null){
					headerList[idx]['required']=false
				}
				if(headerList[idx]['noDuplicates']==null){
					headerList[idx]['noDuplicates']=false
				}
				if(headerList[idx]['readonly']==null){
					headerList[idx]['readonly']=false
				}
				if(headerList[idx]['initFunc']==null){
					headerList[idx]['initFunc']=null
				}
				switch(headerList[idx].type){
					case 'number':
						this.filterList[headerList[idx].id]={
							start:null,end:null,
							hasFilter:(filter)=>{return !(filter.start==null&&filter.end==null)},
							// trueの場合はフィルタリングで非表示
							func:(targetValue,filter)=>{
								const start = filter?.start ?? null
								const end = filter?.end ?? null
								if(start==null&&end==null){
									return false
								}
								let isFilter=true
								if(start!=null){
									if(targetValue<start){
										return true
									}
								}
								if(end!=null){
									if(targetValue>end){
										return true
									}
								}
								return false
							}
						}
					break
					case 'select':
						this.filterList[headerList[idx].id]={
							value:null,
							hasFilter:(filter)=>{return !(filter.value==null ||filter.value=='')},
							func:(targetValue,filter)=>{}
						}
					break
					case 'date':
						this.filterList[headerList[idx].id]={
							value:null,
							hasFilter:(filter)=>{return !(filter.value==null ||filter.value=='')},
							func:(targetValue,filter)=>{}
						}
					break
					case 'time':
						this.filterList[headerList[idx].id]={
							value:null,
							hasFilter:(filter)=>{return !(filter.value==null ||filter.value=='')},
							func:(targetValue,filter)=>{}
						}
					break
					case 'datetime':
						this.filterList[headerList[idx].id]={
							value:null,
							hasFilter:(filter)=>{return !(filter.value==null ||filter.value=='')},
							func:(targetValue,filter)=>{}
						}	
					break
					default:
						this.filterList[headerList[idx].id]={value:'',
						hasFilter:(filter)=>{return !(filter.value==null ||filter.value=='')},
						// trueの場合はフィルタリングで非表示
						func:(targetValue,filter)=>{
							const filterValue = filter?.value ?? ''
							if(filterValue === ''){
								return false
							}
							if(targetValue == null || targetValue === undefined){
								return true
							}
							const targetText = String(targetValue).toLowerCase()
							const searchText = String(filterValue).toLowerCase()
							if(!targetText.includes(searchText)){
								return true
							}
							return false
						}}
					break
				}
			}
			this.headerList=headerList
			this.list = []
			this.sortKey = null
			this.sortOrder = 1
		}
		/**
		 * 並び順変更
		 * @param newIdx
		 */
		changeOrder(newIdx){
			const copy = [...this.list]
			const [item] = copy.splice(this.dropIdx, 1)
			copy.splice(newIdx, 0, item)
			this.list=copy
		}
		/**
		 * 初期リスト設定
		 * @param list
		 */
		initList(list){
			this.list = JSON.parse(JSON.stringify(list))
		}
		/**
		 * 追加
		*/
		addList(){
			const addData={}
			for(let header of this.headerList){
				addData[header.id]=null
				if(header['initFunc']!=null){
					addData[header.id] = header.initFunc()
				}
			}
			this.list = [...this.list,addData]
		}
		/**
		 * 挿入
		 * @param idx
		 */
		insert(idx){
			const addData={}
			for(let header of this.headerList){
				addData[header.id]=null
				if(header['initFunc']!=null){
					addData[header.id] = header.initFunc()
				}
			}
			this.list.splice(idx,0,addData)
			this.list = this.list
		}
		/**
		 * コピー
		 * @param idx
		 */
		copy(idx){
			this.copiedData = JSON.parse(JSON.stringify(this.list[idx]))
			this.copiedData =this.copiedData
		}
		/**
		 * 貼り付け
		 * @param idx
		 */
		paste(idx){
			this.list.splice(idx,0,this.copiedData)
			this.list = this.list
		}
		/**
		 * 削除
		 * @param idx
		 */
		deleteList(idx){
			this.list.splice(idx, 1)
		}

		/**
		 * エラーチェック
		 * return
		 */
		checkError(){
			const errorList=[]
			const list = JSON.parse(JSON.stringify(this.list))
			//必須エラー
			{
				const requiredHeaderList = this.headerList.filter(v=>v.required==true)
				for(const header of requiredHeaderList){
					for(let idx in list){
						if(list[idx][header.id]==null||list[idx][header.id]==''){
							errorList.push(`入力必須:${header.name}[${Number(idx)+1}行目]`)
						}
					}
				}
				if(errorList.length>0){
					return errorList
				}
			}
			//重複エラー
			{
				const noDuplicatesList = this.headerList.filter(v=>v.noDuplicates==true)
				for(const header of noDuplicatesList){
					for(let i=0;i<=list.length;i++){
						for(let j = i+1;j<list.length;j++){
							if(list[i][header.id]==list[j][header.id]){
								errorList.push(`データ重複:${header.name}[${Number(i)+1}-${Number(j)+1}行目]`)
							}
						}
					}
				}
			}
			return errorList
		}
		/**
		 * ソート状態を設定する
		 * @param key
		 */
		sortBy(key){
			const existingIndex = this.sortKeys.findIndex(v=>v.key===key)
			if(existingIndex >= 0){
				const existing = this.sortKeys[existingIndex]
				if(existing.order === 1){
					existing.order = -1
				}else if(existing.order === -1){
					this.sortKeys.splice(existingIndex, 1)
					this.sortKeys = [...this.sortKeys]
					return
				}
				this.sortKeys = [...this.sortKeys]
				return
			}
			this.sortKeys = [...this.sortKeys, {key, order: 1}]
		}
		/**
		 * 表示用に並び替えた配列を返す
		*/
		get sortList(){
			if(this.sortKeys.length===0){
				return this.list
			}
			const sorted = [...this.list]
			sorted.sort((a,b)=>{
				for(const rule of this.sortKeys){
					const valueA = a?.[rule.key]
					const valueB = b?.[rule.key]
					const isEmptyA = valueA==null || valueA==='' || valueA===undefined
					const isEmptyB = valueB==null || valueB==='' || valueB===undefined
					if(isEmptyA && isEmptyB){
						continue
					}
					if(isEmptyA){
						return 1 * rule.order
					}
					if(isEmptyB){
						return -1 * rule.order
					}
					const numA = Number(valueA)
					const numB = Number(valueB)
					if(!Number.isNaN(numA) && !Number.isNaN(numB)){
						const diff = (numA - numB) * rule.order
						if(diff !== 0){
							return diff
						}
						continue
					}
					const strA = String(valueA).toLowerCase()
					const strB = String(valueB).toLowerCase()
					const diff = strA.localeCompare(strB) * rule.order
					if(diff !== 0){
						return diff
					}
				}
				return 0
			})
			return sorted
		}

		/**
		 * フィルタリング
		 * @param idx
		 * return trueの場合は通過,falseの場合はフィルタリングで非表示
		 */
		isFilter(idx){
			const one = this.list[idx]
			for(let id in this.filterList){
				const filter = this.filterList[id]
				if(filter.func(one?.[id],filter)){
					return false 
				}
			}
			return true
		}
	}
</script>
<script>
	import { onMount,createEventDispatcher } from "svelte"
	import Popup from "$comp/Popup.svelte"
	import Media from "$comp/Media.svelte"
	import ContentsMenu from "$comp/ContentsMenu.svelte"

	const dispatch = createEventDispatcher()
	let contentMenuIdx=$state(-1)
	let contentMenuHeader=$state(null)
	/*******************
	 * argument
	*/
	let isAddHeaderPopup=$state(false)
	let { value = $bindable(null)} = $props()

	/*******************
	 * function
	*/
	onMount(() => {
	})
</script>
	<div class="spread-sheet">
		<table>
			<thead>
				<tr>
					<th class="first-td">No</th>
					{#each value.headerList as header}
						<th class="data-th" style={header.width == null || header.width === undefined ? undefined : `width:${header.width}px`}>
							<div class="table-header-cell">
								<textarea class="table-header-resize {value.filterList[header.id].hasFilter(value.filterList[header.id])?'has-filter':''}" value={header.name} readonly
									ondblclick={()=>{contentMenuHeader=header.id}}
									ontouchend={()=>{contentMenuHeader=header.id}}
								></textarea>
								<button class="sort-button" onclick={() => value.sortBy(header.id)}>
								<span class="material-symbols-outlined">
									{(() => {
										const rule = value.sortKeys.find(v => v.key === header.id)
										if(!rule){
											return 'unfold_more'
										}
										return rule.order === 1 ? 'south' : 'north'
									})()}
								</span>
								</button>
							</div>
							<!-- フィルター-->
							<ContentsMenu
								id={header.id}
								on:close={()=>{contentMenuHeader=null}}
								value={contentMenuHeader==header.id}>
								<div class="flex" style="width:100%;">
									<h4>フィルター</h4>
									{#if header.type=='datetime'}
										{header.type}
										<input type="date"  onchange={(e)=>{value.filterList[header.id].start}}>
										<input type="date"  onchange={(e)=>{value.filterList[header.id].end}}>
									{:else if header.type=='number'}
										<input type="number" class="f1" style="width:40%;" bind:value={value.filterList[header.id].start}/>
										<span class="f1">〜</span>
										<input type="number" class="f1" style="width:40%;" bind:value={value.filterList[header.id].end}/>
									{:else}
										<input type="text" class="f1" bind:value={value.filterList[header.id].value}/>
									{/if}
								</div>
							</ContentsMenu>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
			{#each value.sortList as one,idx}
				{#if value.isFilter(idx)}
					<tr class="{contentMenuIdx==idx?'selected':''}">
						<td class="first-td">
							<button
								class="drag-handle"
								style="height:3em;position:relative;"
								draggable="true"
								ondragstart={() => {value.dropIdx=idx}}
								ondragover={(e) => e.preventDefault()}
								ondrop={() => {value.changeOrder(idx)}}
								onclick={()=>{contentMenuIdx=idx}}
							>
								{idx+1}
							</button>
							<!-- コンテンツメニュー　-->
							<ContentsMenu
								id={idx}
								on:close={()=>{contentMenuIdx=-1}}
								value={contentMenuIdx==idx}>
								<!--追加-->
								<button onclick={()=>{value.insert(idx);contentMenuIdx=-1;}}>
									<span class="material-symbols-outlined">add</span>Insert
								</button>
								<!--コピー-->
								<button onclick={()=>{value.copy(idx);contentMenuIdx=-1;}}>
									<span class="material-symbols-outlined">content_copy</span>Copy
								</button>
								<!--貼り付けー-->
								<button onclick={()=>{value.paste(idx);contentMenuIdx=-1;}}>
									<span class="material-symbols-outlined">chat_paste_go</span>Paste
								</button>
								<!--行削除-->
								<button onclick={()=>{value.deleteList(idx);contentMenuIdx=-1;}}>
									<span class="material-symbols-outlined">delete</span>Delete
								</button>
							</ContentsMenu>
						</td>
						{#each value.headerList as header}
							<td style="width:{header.width}px;">
							{#if header.type=='datetime'}
								<input type="datetime-local" bind:value={one[header.id]} required={header.required} readonly={header.readonly}>
							{:else if header.type=='time'}
								<input type="time" bind:value={one[header.id]} required={header.required} readonly={header.readonly}>
							{:else if header.type=='date'}
								<input type="date" bind:value={one[header.id]} required={header.required} readonly={header.readonly}>
							{:else if header.type=='number'}
								<input type="number" bind:value={one[header.id]} required={header.required} readonly={header.readonly}>
							{:else if header.type=='textarea'}
								<textarea bind:value={one[header.id]} required={header.required} readonly={header.readonly}></textarea>
							{:else if header.type=='select'}
								<select bind:value={one[header.id]} required={header.required}>
									{#each header.list as data}
										<option value={data.value ?? data} disabled={header.readonly}>{data.label ?? data}</option>
									{/each}
								</select>
							{:else if header.type=='media'}
								<Media bind:value={one[header.id]} base64Func={header.base64Func}></Media>
							{:else}
								<input type="text" bind:value={one[header.id]} required={header.required} readonly={header.readonly}>
							{/if}
							</td>
						{/each}
					</tr>
					{/if}
				{/each}
				<tr>
					<td colspan={value.headerList.length+1}>
						<button onclick={()=>{value.addList()}}
							class="btn add material-symbols-outlined">add</button>
					</td>
				</tr>
			</tbody>
		</table>
		<Popup value={isAddHeaderPopup}
			onclose={()=>{isAddHeaderPopup=false}}
		>
		</Popup>
	</div>
<style>
	.spread-sheet{
		position:relative;
	}
	table{
		border-spacing: 0;
	}

	th,td{
		height:1em;
		margin:0;
		border-collapse: collapse;
		border:dashed 0.5px;
		border-color:black;
		background:transparent;

	}
	tr.selected{
		background:var(--selected-blue-color);
	}
	thead{
		position:sticky;
		position:-webkit-sticky;
		top:0;
		background:transparent;
		
	}

	td input,
	td textarea,
	td select,
	td .media{
		width: calc(100%);
		height:calc(100%);
		border:none;
		background:white;
		border-radius: 0;
		box-sizing: border-box;
	}


	td input:focus,
	td textarea:focus,
	td select:focus{
		border-radius:0;
		background:rgb(224, 235, 255);
		outline: none;
	}



	td input:read-only,
	td textarea:read-only{
		background:var(--main);
	}

	.first-td{
		position:sticky;
		position:-webkit-sticky;
		left:0;
		width:4em;
		height:100%;
		background:var(--main1);
		text-align:center;
	}

	.first-td button{
		width:100%;
		background:var(--main1);
		border:none;
		cursor:pointer;
	}

	.data-th{
		min-width:4em;
		background:var(--main1);
	}

	.add{
		width:100%;
		font-size:2em;
		color:white;
		background:var(--confirm);
		opacity:0.9;
		border:none;
		cursor:pointer;
	}
	
	.table-header-resize{
		background:transparent;
    resize: horizontal;
		border:none;
		height:1em;
		font-weight: 500;
		cursor:pointer;
	}
	.table-header-resize::-webkit-resizer {
		padding:0;
		margin:0;
		background:var(--main1);
	}
	.table-header-cell{
		display:flex;
		align-items:center;
		gap:0.25em;
	}
	.sort-button{
		padding:0;
		border:none;
		background:transparent;
		color:var(--base1);
		cursor:pointer;
		display:flex;
		align-items:center;
		justify-content:center;
		line-height:1;
	}
	.sort-button *{
		font-size:1em;
	}
	.has-filter{
		color:var(--confirm);
	}
</style>