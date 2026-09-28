<script>
  import { onMount } from "svelte"
  import { MediaClass } from "$lib/MediaClass.js"
  import Popup from "$comp/Popup.svelte"
  import Format from "$comp/Format.svelte"
  import Icon from "./Icon.svelte"
    import Input from "./Input.svelte"

  /*******************
   * argument
   * value {
   * name:ファイル名(pathは無し),
   * screenSize:{width,height},
   * size:メディアメモリ容量バイト,
   * mime:image or video,
   * src:https:///〜 or base64}
   * {"name":"a_3.jpg","screenSize":{"width":3000,"height":4000},"size":1165946,"mime":"image","src":"https:〜"}]}]
   */
  let { value = $bindable([]), base64Func = () => {} } = $props()
  let element
  let selectedMediaIdx = $state(-1)
  //0:横,1;縦
  let popupSize = $state(0)
  let popupZoom = $state(1)
  let baseSizeSrc = $state({ src: "", size: 0 })
  /*******************
   * function
   */
  onMount(() => {})
  /**
   * アップロードファイル
   */
  function uploadFile() {
    element.click()
  }
  /**
   * ファイルアップロード
   * @param event
   */
  async function upload(e) {
    const files = e.target.files
    for (let file of files) {
      let mime = ""
      if (file.type.startsWith("image/")) {
        mime = "image"
      } else if (file.type.startsWith("video/")) {
        mime = "video"
      }
      const screenSize = await MediaClass.getScreenSizeFile(file)
      const name = file.name
      const size = file.size
      let base64 = await MediaClass.fileToBase64(file)
      if (value == null) {
        value = []
      }
      value = [
        ...value,
        {
          name: name,
          screenSize: screenSize,
          size: size,
          mime: mime,
          src: base64,
        },
      ]
    }
  }

  /**
   * メディアを開く
   * @param idx
   */
  function openMedia(idx) {
    baseSizeSrc = { src: "", size: 0 }
    selectedMediaIdx = idx
  }
  /**
   * メディア削除
   */
  function deleteMedia() {
    value.splice(selectedMediaIdx, 1)
    selectedMediaIdx = -1
  }
  /**リサイズ*/
  async function resizeImage() {
    const data = value[selectedMediaIdx]
    baseSizeSrc.src = data.src
    baseSizeSrc.size = data.size
    let result

    //data.srcがbase64ではない場合、base64Funcからbase64を取得して代入
    if (data.src && !data.src.startsWith("data:")) {
      const urlBase64 = await base64Func(data.name)
      if (typeof urlBase64 === "string" && urlBase64.trim() !== "") {
        data.src = urlBase64
      }
    }

    if (data.mime === "video") {
      result = await MediaClass.convertVideoToWebm(data.src)
      const nameArray = data.name.split(".")
      data.name = nameArray[0] + ".webm"
    } else {
      result = await MediaClass.resizeImage(data.src)
    }
    data.src = result.base64
    data.size = result.size
  }
  /**
   * リサイズを戻す
   */
  function redoResize() {
    const data = value[selectedMediaIdx]
    data.src = baseSizeSrc.src
    data.size = baseSizeSrc.size
  }

  /**
   * 選択したメディアを先頭にする
   */
  function moveTop() {
    if (
      value == null ||
      selectedMediaIdx < 0 ||
      selectedMediaIdx >= value.length
    ) {
      return
    }
    const item = value.splice(selectedMediaIdx, 1)[0]
    if (item) {
      value.unshift(item)
    }
    selectedMediaIdx = 0
  }
</script>

<div class="media">
  <input
    bind:this={element}
    type="file"
    multiple
    style="display:none"
    onchange={upload}
  />
  <span class="media-input" style={`width:${(value?.length ?? 0) * 6}em`}>
    <span class="scroll non-scroll-bar">
      <button
        class="input-button"
        onclick={() => {
          uploadFile()
        }}
      ></button>
      {#each value as data, idx}
        <button
          class="material-symbols-outlined"
          onclick={() => {
            openMedia(idx)
          }}
        >
          {#if data.mime == "image"}
            {#if typeof data.src !== "string" || !data.src.startsWith("data:")}
              <img src={data.src + "?v=" + Date.now()} />
            {:else}
              <img src={data.src} />
            {/if}
          {:else if data.mime == "video"}
            video_camera_back
          {/if}
        </button>
      {/each}
    </span>
  </span>
</div>
<Popup
  value={selectedMediaIdx != -1}
  on:close={() => {
    selectedMediaIdx = -1
  }}
  width="80%"
	closeBtn={false}
>
  <span class="popup-title flex" slot="title">
    <span class="f2">
      <input
        type="text"
        style="width:10em;"
        bind:value={value[selectedMediaIdx].name}
      />
    </span>
    <Format bind:value={value[selectedMediaIdx].size} type="byte" comma
    ></Format>
    <button
      class="material-symbols-outlined f1"
      onclick={() => {
        popupSize = 0
      }}>fit_page_width</button
    >
    <button
      class="material-symbols-outlined f1"
      onclick={() => {
        popupSize = 1
      }}>fit_page_height</button
    >
    <button
      class="material-symbols-outlined f1"
      onclick={() => {
        popupZoom = 1
      }}>fullscreen</button
    >
  </span>
  <span class="popup-block {popupSize == 0 ? 'width-full' : 'height-full'}">
    {#if value[selectedMediaIdx].mime == "image"}
      {#if typeof value[selectedMediaIdx].src !== "string" || !value[selectedMediaIdx].src.startsWith("data:")}
        <img
          src={value[selectedMediaIdx].src + "?v=" + Date.now()}
          style="transform: scale({popupZoom});transform-origin: center;"
        />
      {:else}
        <img
          src={value[selectedMediaIdx].src}
          style="transform: scale({popupZoom});transform-origin: center;"
        />
      {/if}
    {:else if value[selectedMediaIdx].mime == "video"}
      {#if typeof value[selectedMediaIdx].src !== "string" || !value[selectedMediaIdx].src.startsWith("data:")}
        <video
          controls
          style="transform: scale({popupZoom});transform-origin: center;"
        >
          <source
            src={value[selectedMediaIdx].src + "?v=" + Date.now()}
            type="video/webm"
          />
        </video>
      {:else}
        <video
          controls
          style="transform: scale({popupZoom});transform-origin: center;"
        >
          <source src={value[selectedMediaIdx].src} type="video/webm" />
        </video>
      {/if}
    {/if}
  </span>
  <span slot="footer" class="footer">
    <!--リサイズを戻す-->
    {#if baseSizeSrc.src != ""}
		<span class="f1">
      <button
        class="btn"
        onclick={() => {
          redoResize()
        }}
      >
				<Icon value="undo"></Icon>戻る
			</button>
		</span>
    {/if}
    <!--リサイズ-->
		<span class="f1">
			<button
				class="btn"
				onclick={async () => {
					await resizeImage()
				}}
			>
			<Icon value="crop_free"></Icon>サイズ縮小
			</button>
		</span>
    <!--メディアの順番を先頭にする-->
		<span class="f1">
			<button
				class="btn"
				onclick={async () => {
					moveTop()
				}}
			>
			<Icon value="horizontal_align_left"></Icon>先頭
			</button>
		</span>
    <!--削除-->
		<span class="f1">
			<button
				class="delete-btn btn"
				style="height:100%;"
				onclick={() => {
					deleteMedia()
				}}
			>
				<Icon value="delete"></Icon>
				削除
			</button>
		</span>
  </span>
</Popup>

<style>
  .media {
    display: inline-block;
    width: 100%;
    height: 100%;
    background: white;
  }
  .media-input {
    width: 100%;
    height: 100%;
    max-width: 10em;
    overflow: hidden;
  }
  .media-input .scroll {
    display: flex;
    overflow-x: scroll;
  }

  .media-input .scroll button {
    width: 1.5em;
    height: 1.5em;
    padding: 0;
    margin-left: 10px;
    margin-right: 10px;
  }
  .input-button {
    width: 2em !important;
    height: 2em !important;
  }
  .media-input .scroll button * {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }
	.popup{
		position:fixed;
		z-index:999!important;
	}
  .popup-block {
    width: 100%;
    height: 100%;
    display: flex;
    overflow: auto;
    text-align: center;
  }

  .popup-block img,
  .popup-block video {
    left: 0;
    right: 0;
    margin: auto;
  }
  .width-full * {
    width: 100%;
    height: auto;
  }
  .height-full * {
    width: auto;
    height: 100%;
  }
  .popup-title {
    margin-left: 1em;
		z-index:999;
  }
  .popup-title button {
    font-size: 1em;
    height: 100%;
  }

  .footer {
  	display:flex;
		height:100%;
		width:100%;
  }
</style>
