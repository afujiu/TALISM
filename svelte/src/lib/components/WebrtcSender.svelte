<script>
	import { onDestroy } from 'svelte'

	let videoElement

	let pc = null
	let stream = null

	let offer = $state('')
	let answer = $state('')

	let started = $state(false)
	let connected = $state(false)
	let errorMessage = $state('')


	// -----------------------------
	// カメラ開始
	// -----------------------------

	async function startCamera() {

		try {

			errorMessage = ''

			stream = await navigator.mediaDevices.getUserMedia({
				video: {
					width: {
						ideal: 1280
					},
					height: {
						ideal: 720
					}
				},
				audio: false
			})

			videoElement.srcObject = stream

			started = true
			await createOffer()

		} catch (error) {

			console.error(error)

			errorMessage =
				'カメラを取得できませんでした: ' +
				error.message

		}
	}


	// -----------------------------
	// Offer作成
	// -----------------------------

	async function createOffer() {

		if (!stream || pc) {
			return
		}

		try {

			pc = new RTCPeerConnection({
				iceServers: []
			})


			// カメラ映像をWebRTCに追加

			for (const track of stream.getTracks()) {

				pc.addTrack(
					track,
					stream
				)

			}


			// 接続状態

			pc.onconnectionstatechange = () => {

				console.log(
					'Connection:',
					pc.connectionState
				)

				if (
					pc.connectionState === 'connected'
				) {
					connected = true
				}

				if (
					pc.connectionState === 'disconnected' ||
					pc.connectionState === 'failed' ||
					pc.connectionState === 'closed'
				) {
					connected = false
				}

			}


			// ICEが取得された

			pc.onicecandidate = event => {

				// nullになったらICE収集完了

				if (!event.candidate) {

					offer =
						JSON.stringify(
							pc.localDescription
						)

					console.log(
						'Offer作成完了'
					)

				}

			}


			// Offer作成

			const offerDescription =
				await pc.createOffer()


			await pc.setLocalDescription(
				offerDescription
			)

		} catch (error) {

			console.error(error)

			errorMessage =
				'Offer作成に失敗しました: ' +
				error.message

		}
	}


	// -----------------------------
	// Answer設定
	// -----------------------------

	async function setAnswer() {

		if (!pc) {
			errorMessage =
				'先にOfferを作成してください'
			return
		}

		if (!answer.trim()) {
			return
		}

		try {

			const answerData =
				JSON.parse(answer)


			await pc.setRemoteDescription(
				new RTCSessionDescription(
					answerData
				)
			)

			console.log(
				'Answer設定完了'
			)

		} catch (error) {

			console.error(error)

			errorMessage =
				'Answerの設定に失敗しました: ' +
				error.message

		}
	}


	// -----------------------------
	// 切断
	// -----------------------------

	function disconnect() {

		if (pc) {

			pc.close()
			pc = null

		}

		connected = false

	}


	// -----------------------------
	// 終了処理
	// -----------------------------

	onDestroy(() => {

		if (pc) {
			pc.close()
		}

		if (stream) {

			for (const track of stream.getTracks()) {
				track.stop()
			}

		}

	})

</script>


<div class="container">

	<h1>WebRTC 発信側</h1>


	<!-- カメラ映像 -->

	<video
		bind:this={videoElement}
		autoplay
		muted
		playsinline
	></video>


	<!-- カメラ開始 -->

	{#if !started}

		<button onclick={startCamera}>
			カメラ開始
		</button>

	{:else}

		<button onclick={createOffer}>
			Offer作成
		</button>

	{/if}


	<!-- Offer -->

	{#if offer}

		<div class="section">

			<h2>1. Offer</h2>

			<p>
				以下をコピーして受信側へ送ってください。
			</p>

			<textarea
				value={offer}
				readonly
			></textarea>

			<button
				onclick={() => navigator.clipboard.writeText(offer)}
			>
				Offerをコピー
			</button>

		</div>

	{/if}


	<!-- Answer -->

	{#if offer}

		<div class="section">

			<h2>2. Answer</h2>

			<p>
				受信側で作成したAnswerを貼り付けてください。
			</p>

			<textarea
				bind:value={answer}
				placeholder="Answerを貼り付け"
			></textarea>

			<button onclick={setAnswer}>
				Answerを設定
			</button>

		</div>

	{/if}


	<!-- 接続状態 -->

	<div class="status">

		{#if connected}

			<span class="connected">
				● 接続中
			</span>

		{:else}

			<span>
				● 未接続
			</span>

		{/if}

	</div>


	{#if pc}

		<button onclick={disconnect}>
			切断
		</button>

	{/if}


	{#if errorMessage}

		<div class="error">
			{errorMessage}
		</div>

	{/if}

</div>


<style>

.container {
	max-width: 900px;
	margin: 0 auto;
	padding: 20px;
}

video {
	width: 100%;
	background: #000;
	display: block;
	margin-bottom: 20px;
}

textarea {
	width: 100%;
	height: 180px;
	box-sizing: border-box;
	resize: vertical;
	margin-bottom: 10px;
	font-family: monospace;
}

button {
	padding: 10px 20px;
	margin: 5px 0;
	cursor: pointer;
}

.section {
	margin-top: 30px;
}

.status {
	margin: 20px 0;
}

.connected {
	color: green;
	font-weight: bold;
}

.error {
	margin-top: 20px;
	padding: 10px;
	background: #fee;
	color: red;
}

</style>