<script>
  import { onMount, untrack } from "svelte"
  import { updated } from "$app/state"
  import { account, ui } from "$lib/store"
  import { piSound } from "$lib/Sound.js"
  import { nowDateYMD } from "$lib/Date.js"
  import { uploadCsvConvertJson } from "$lib/Upload.js"
  import Loading from "$comp/Loading.svelte"
  import Icon from "$comp/Icon.svelte"
  import Fab from "$comp/Fab.svelte"
  import Format from "$comp/Format.svelte"
  import Input from "$comp/Input.svelte"
  import Popup from "$comp/Popup.svelte"

  /*******************
   * argument
   */
  let isLoading = $state(true)
  let isSaving = $state(false)
  let selectedCategory = $state("")

  const categoryList = $state([
    "カーモデル",
    "オートバイ",
    "ミリタリーミニチュア",
    "飛行機",
    "艦船",
    "恐竜",
    "工作",
    "ミニ四駆",
    "ミニ四駆パーツ",
    "ラジコン",
    "メイクアップ材",
    "塗料",
    "クラフトツール",
    "ガンプラ",
    "キャラクターモデル",
    "30MM",
    "その他",
  ])

  const makerList = $state([
    "バンダイ",
    "タミヤ",
    "ハセガワ",
    "アオシマ",
    "ミスターホビー",
    "ガイアノーツ",
    "フジミ模型",
    "コトブキヤ",
    "ファインモールド",
    "アーテック",
    "東京マルイ",
    "LAYLAX",
  ])

  let header = $state([
    { key: "brand", name: "ブランド" },
    { key: "category", name: "カテゴリ" },
    { key: "created_at", name: "更新日時" }, //2026-09-07T04:58:+00:00
    { key: "update_at", name: "更新日時" },
    { key: "id", name: "Id" },
    { key: "jancode", name: "JANコード" },
    { key: "maker", name: "メーカー" },
    { key: "meta", name: "メタ情報" },
    { key: "name", name: "品名" },
    { key: "price", name: "単価" },
    { key: "quantity", name: "数量" },
    { key: "seo", name: "SEO" },
    { key: "seriescode", name: "シリーズコード" },
  ])
  let list = $state([])

  const uploadData = $state({
    isUpload: false,
    bulkMaker: "",
    bulkCategory: "",
    list: [],
  })

  /*******************
   * funcrion
   */

  onMount(async () => {
    const result = await $account.getDb("products")
    if (result.ok) {
      list = result.data
      for (let idx in list) {
        list[idx]["editQuantity"] = null
      }
    }
    isLoading = false
  })

  /**
   * CSVファイルアップロード
   */
  async function upload() {
		uploadData.list=[]
    const uploadList = await uploadCsvConvertJson()
    if (uploadList.length > 0) {
      uploadData.list = [...uploadList]
      uploadData.isUpload = true
    }
  }

  /**
   * 一覧のjancodeから商品情報をセット
   */
  async function saveUpdateData() {
		// 一定間隔でjanコードapiリクエストを投げる
    /**
     * @param {Array<Record<string, any>>} list
     * @param {number} idx
     * @returns {Promise<void>}
     */
    const jancodeFunc = async (list,idx) => {
      return new Promise((resolve) => {
        if (list.length <= idx) {
          resolve()
            return
        }
        setTimeout(async () => {
          try {
            if (list[idx].jancode) {
              let jancodeData = await $account.getJancode(
                "cf_api_jancode",
                list[idx].jancode,
              )
              if (jancodeData != null) {
                jancodeData = jancodeData[0]
                console.log(jancodeData)
                if (jancodeData?.name && jancodeData?.brand?.name && jancodeData?.price) {
                  list[idx].name = list[idx].name ? list[idx].name : jancodeData.name
                  list[idx].brand = list[idx].brand ? list[idx].brand : jancodeData.brand.name
                  list[idx].price = list[idx].price ? list[idx].price : jancodeData.price
                }
              }
            }
          } catch (e) {
            console.log(e)
          }
          await jancodeFunc(list, idx + 1)
          resolve()
        }, 2000)
      })
    }
		//商品名取得
		await jancodeFunc(uploadData.list,0)
		console.log(uploadData)
		for(let idx in uploadData.list){
			uploadData.list[idx].maker = uploadData.bulkMaker
			uploadData.list[idx].category = uploadData.bulkCategory
		}
		console.log('upsertDb')
		await $account.upsertDb('products',uploadData.list,'jancode')
		uploadData.isUpload=false
  }
</script>

<Loading {isLoading}>
  <div class="container">
    <div class="flex sticky non-scroll-bar">
      <div class="f1 flex tab">
        <button
          class="f1 def-btn {selectedCategory == '' ? 'selected' : ''}"
          onclick={() => {
            selectedCategory = ""
          }}>全て</button
        >
        {#each categoryList as category}
          <button
            class="f1 def-btn {selectedCategory == category ? 'selected' : ''}"
            onclick={() => {
              selectedCategory = category
            }}>{category}</button
          >
        {/each}
      </div>
      <div class="f1"></div>
    </div>
    <div style="width:100%;height:100%;overflow:auto;">
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>メーカー</th>
            <th>カテゴリー</th>
            <th>シリーズコード</th>
            <th style="width:30em;">品名</th>
            <th>単価</th>
            <th>数量</th>
            <th>JANコード</th>
            <th>更新日</th>
            <th>更新</th>
          </tr>
        </thead>
        <tbody>
          {#each list as data, idx}
            <tr>
              <td class="first-td">{idx + 1}</td>
              <td
                ><Input type="datalist" list={makerList} bind:value={data.maker}
                ></Input></td
              >
              <td
                ><Input
                  type="select"
                  list={categoryList}
                  bind:value={data.category}
                ></Input></td
              >
              <td><Input type="text" bind:value={data.seriescode} /></td>
              <td style="width:30em;"><Input bind:value={data.name}></Input></td
              >
              <td><Input type="number" bind:value={data.price}></Input></td>
              <td class="flex">
                <div class="f1">
                  <Format type="number" value={data.quantity}></Format>
                </div>
                <div class="f3">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    bind:value={data.editQuantity}
                  ></Input>
                </div>
              </td>
              <td><Input type="text" bind:value={data.jancode}></Input></td>
              <td><Format type="from-time" value={data.update_at}></Format></td>
              <td><button class="btn confirm-btn">Save</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <Fab>
      <span class="f1">
        <button
          class="btn"
          onclick={async () => {
            upload()
          }}><Icon value="upload"></Icon>アップロード</button
        >
      </span>
      <span class="f1">
        <button class="btn"><Icon value="download"></Icon>ダウンロード</button>
      </span>
      <span class="f1">
        <button class="btn"><Icon value="barcode"></Icon>スキャン</button>
      </span>
      <span class="f1">
        <button class="btn confirm-btn">一括更新</button>
      </span>
    </Fab>
  </div>
  <!--CSVアップロードポップアップ------------------------------------------------------->
  <Popup
    bind:value={uploadData.isUpload}
    on:close={() => {
      uploadData.isUpload = false
    }}
  >
    <span slot="title"> CSVアップロード </span>
    <div class="flex">
      <span class="f1 align-right">{uploadData.list.length}件</span>
    </div>
    <div class="flex">
      <span class="f1">一括カテゴリー</span>
      <span class="f2"
        ><Input
          type="select"
          bind:value={uploadData.bulkCategory}
          list={categoryList}
        ></Input></span
      >
    </div>
    <div class="flex">
      <span class="f1">一括メーカー</span>
      <span class="f2"
        ><Input type="select" bind:value={uploadData.bulkMaker} list={makerList}
        ></Input></span
      >
    </div>
    <div class="flex">
      <span class="f1">
        <button class="btn" onclick={async()=>{await saveUpdateData()}}>保存</button>
      </span>
    </div>
  </Popup>
  <!--CSVアップロードポップアップ------------------------------------------------------->
</Loading>

<style>
  .container {
    position: relative;
  }
  .sticky {
    position: sticky;
    position: -webkit-sticky;
    left: 0;
    top: 0;
    width: 100%;
    height: 3em;
    overflow-x: auto;
    z-index: 900;
  }
  .tab button {
    opacity: 0.5;
    outline: none;
    font-weight: lighter;
  }
  .tab button:hover,
  .tab button:focus {
    opacity: 1;
  }
  .tab button.selected {
    opacity: 1;
    font-weight: bold;
    color: var(--confirm);
  }

  td {
    height: 2em;
    min-width: 5em;
  }
  .first-td {
    width: 1em;
  }
</style>
