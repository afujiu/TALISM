<script>
	import { onDestroy } from 'svelte'

	let videoElement

	let pc = null

	let offer = $state('')
	let answer = $state('')

	let connected = $state(false)
	let receiving = $state(false)
	let errorMessage = $state('')


	// -----------------------------
	// OfferからAnswerを作成
	// -----------------------------

	async function createAnswer() {

		if (!offer.trim()) {
			errorMessage =
				'Offerを入力してください'
			return
		}

		try {

			errorMessage = ''


			// -----------------------------
			// WebRTC
			// -----------------------------

			pc = new RTCPeerConnection({
				iceServers: []
			})


			// -----------------------------
			// 映像受信
			// -----------------------------

			pc.ontrack = event => {

				console.log(
					'映像を受信',
					event
				)

				if (
					event.streams &&
					event.streams.length > 0
				) {

					videoElement.srcObject =
						event.streams[0]

					receiving = true

				}

			}


			// -----------------------------
			// 接続状態
			// -----------------------------

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


			// -----------------------------
			// ICE
			// -----------------------------

			pc.onicecandidate = event => {

				if (!event.candidate) {

					answer =
						JSON.stringify(
							pc.localDescription
						)

					console.log(
						'Answer作成完了'
					)

				}

			}


			// -----------------------------
			// Offer設定
			// -----------------------------

			const offerData =
				JSON.parse(offer)


			await pc.setRemoteDescription(
				new RTCSessionDescription(
					offerData
				)
			)


			// -----------------------------
			// Answer作成
			// -----------------------------

			const answerDescription =
				await pc.createAnswer()


			await pc.setLocalDescription(
				answerDescription
			)

		} catch (error) {

			console.error(error)

			errorMessage =
				'Answer作成に失敗しました: ' +
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
		receiving = false

	}


	onDestroy(() => {

		if (pc) {
			pc.close()
		}

	})

</script>


<div class="container">

	<h1>WebRTC 受信側</h1>


	<!-- 映像 -->

	<video
		bind:this={videoElement}
		autoplay
		playsinline
	></video>


	<!-- Offer -->

	<div class="section">

		<h2>1. 発信側のOffer</h2>

		<p>
			発信側で作成したOfferを貼り付けてください。
		</p>

		<textarea
			bind:value={offer}
			placeholder="Offerを貼り付け"
		></textarea>


		<button onclick={createAnswer}>
			Answer作成
		</button>

	</div>


	<!-- Answer -->

	{#if answer}

		<div class="section">

			<h2>2. Answer</h2>

			<p>
				このAnswerを発信側へ送ってください。
			</p>

			<textarea
				value={answer}
				readonly
			></textarea>


			<button
				onclick={() =>
					navigator.clipboard.writeText(answer)
				}
			>
				Answerをコピー
			</button>

		</div>

	{/if}


	<!-- 状態 -->

	<div class="status">

		{#if connected}

			<span class="connected">
				● 接続中
			</span>

		{:else if receiving}

			<span>
				● 映像受信中
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