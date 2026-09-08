<script>
  import { onMount, onDestroy } from "svelte"

  import {
    connectBroadcast,
    sendOffer,
    sendCandidate,
    sendLeave,
    disconnectBroadcast,
  } from "$lib/broadcast.js"

  // ----------------------------------------
  // 設定
  // ----------------------------------------

  const room = "camera-room"

  const myId = "camera-1"

  // ----------------------------------------
  // 状態
  // ----------------------------------------

  /** @type {HTMLVideoElement} */
  let videoElement

  /** @type {MediaStream | null} */
  let stream = null

  let status = $state("未接続")
  let facingMode = $state("environment")

  let viewerConnected = false

  // viewerごとのPeerConnection
  const peers = new Map()
  const pendingCandidates = new Map()

  /** @param {string} mode */
  async function getCameraStream(mode) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 16 / 9 },
        },
        audio: true,
      })
    } catch (error) {
      if (mode !== "user" && mode !== "environment") throw error

      return navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 16 / 9 },
        },
        audio: true,
      })
    }
  }

  async function switchCamera() {
    const nextFacingMode = facingMode === "environment" ? "user" : "environment"
    status = "カメラ切替中..."

    try {
      const nextStream = await getCameraStream(nextFacingMode)
      const oldStream = stream

      for (const pc of peers.values()) {
        for (const sender of pc.getSenders()) {
          const nextTrack = nextStream.getTracks().find(
            (track) => track.kind === sender.track?.kind,
          )
          if (nextTrack) await sender.replaceTrack(nextTrack)
        }
      }

      stream = nextStream
      videoElement.srcObject = nextStream
      oldStream?.getTracks().forEach((track) => track.stop())
      facingMode = nextFacingMode
      status = peers.size > 0 ? "接続済み" : "待機中"
    } catch (error) {
      console.error(error)
      status = `カメラ切替に失敗しました: ${error instanceof Error ? error.message : String(error)}`
    }
  }

  // ----------------------------------------
  // 初期化
  // ----------------------------------------

  onMount(async () => {
    try {
      status = "カメラ取得中..."

      // カメラ取得
      stream = await getCameraStream(facingMode)

      videoElement.srcObject = stream

      status = "Broadcast接続中..."

      // Supabase Broadcast接続
      await connectBroadcast(room, handleSignal)

      status = "待機中"
    } catch (error) {
      console.error(error)

      status = error instanceof Error ? error.message : String(error)
    }
  })

  // ----------------------------------------
  // Broadcast受信
  // ----------------------------------------

  /** @param {any} data */
  async function handleSignal(data) {
    console.log("signal:", data)

    // 自分宛てではない
    if (data.to && data.to !== myId) {
      return
    }

    // Join
    if (data.type === "join") {
      await createPeerConnection(data.from)

      return
    }

    // Answer
    if (data.type === "answer") {
      const pc = peers.get(data.from)

      if (!pc) {
        return
      }

      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))

      const candidates = pendingCandidates.get(data.from) ?? []
      for (const candidate of candidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
      pendingCandidates.delete(data.from)

      viewerConnected = true

      status = "接続済み"

      return
    }

    // ICE Candidate
    if (data.type === "candidate") {
      const pc = peers.get(data.from)

      if (!pc) {
        return
      }

      try {
        if (!pc.remoteDescription) {
          const candidates = pendingCandidates.get(data.from) ?? []
          candidates.push(data.candidate)
          pendingCandidates.set(data.from, candidates)
          return
        }
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
      } catch (error) {
        console.error("ICE Candidate error:", error)
      }

      return
    }

    // Leave
    if (data.type === "leave") {
      const pc = peers.get(data.from)

      if (pc) {
        pc.close()

        peers.delete(data.from)
      }

      pendingCandidates.delete(data.from)

      viewerConnected = false

      status = "待機中"
    }
  }

  // ----------------------------------------
  // PeerConnection作成
  // ----------------------------------------

  /** @param {string} viewerId */
  async function createPeerConnection(viewerId) {
    // 既に存在
    if (peers.has(viewerId)) {
      return
    }

    console.log("PeerConnection作成:", viewerId)

    const currentStream = stream
    if (!currentStream) return

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    })

    peers.set(viewerId, pc)

    // ------------------------------------
    // カメラ映像を追加
    // ------------------------------------

    currentStream.getTracks().forEach((track) => {
      pc.addTrack(track, currentStream)
    })

    // ------------------------------------
    // ICE Candidate
    // ------------------------------------

    pc.onicecandidate = async (event) => {
      if (!event.candidate) {
        return
      }

      await sendCandidate(viewerId, myId, event.candidate)
    }

    // ------------------------------------
    // 接続状態
    // ------------------------------------

    pc.onconnectionstatechange = () => {
      console.log(viewerId, "connection:", pc.connectionState)

      if (pc.connectionState === "connected") {
        viewerConnected = true

        status = "接続済み"
      }

      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        peers.delete(viewerId)

        viewerConnected = false

        status = "待機中"
      }
    }

    // ------------------------------------
    // Offer作成
    // ------------------------------------

    const offer = await pc.createOffer()

    await pc.setLocalDescription(offer)

    await sendOffer(viewerId, myId, pc.localDescription)

    status = "受信側へ接続要求中..."
  }

  // ----------------------------------------
  // 終了
  // ----------------------------------------

  onDestroy(async () => {
    // PeerConnection終了
    for (const pc of peers.values()) {
      pc.close()
    }

    peers.clear()

    // Leave
    await sendLeave(myId)

    // カメラ停止
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop()
      })

      stream = null
    }

    // Broadcast終了
    await disconnectBroadcast()
  })
</script>

<div class="container">
  <h1>カメラ発信</h1>

  <p>
    状態：{status}
  </p>

  <p>
    カメラ：{myId}
  </p>

  <button type="button" onclick={switchCamera}>
    {facingMode === "environment" ? "インカメラへ切替" : "アウトカメラへ切替"}
  </button>

  <video bind:this={videoElement} autoplay muted playsinline></video>
</div>

<style>
  .container {
    padding: 20px;
  }

  video {
    width: 100%;
    max-width: 800px;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    background: #000;
  }
</style>
