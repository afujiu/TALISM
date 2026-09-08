<script>
    import { onMount, onDestroy } from 'svelte'

    import {
        connectBroadcast,
        sendJoin,
        sendAnswer,
        sendCandidate,
        sendLeave,
        disconnectBroadcast
    } from '$lib/broadcast.js'


    // ----------------------------------------
    // 設定
    // ----------------------------------------

    const room = 'camera-room'

    // 受信側ごとに異なるIDにする
    const myId =
        'viewer-' +
        Math.random()
            .toString(36)
            .substring(2, 8)


    const senderId = 'camera-1'


    // ----------------------------------------
    // 状態
    // ----------------------------------------

    /** @type {HTMLVideoElement} */
    let videoElement

    let pc = null
    const pendingCandidates = []

    async function toggleFullscreen() {
        if (document.fullscreenElement) {
            await document.exitFullscreen()
            return
        }

        if (videoElement.requestFullscreen) {
            await videoElement.requestFullscreen()
        } else {
            const video = /** @type {{ webkitEnterFullscreen?: () => void }} */
                (/** @type {unknown} */ (videoElement))
            video.webkitEnterFullscreen?.()
        }
    }

    async function playVideo() {
        if (!videoElement?.srcObject) {
            return
        }

        try {
            videoElement.load()
            await videoElement.play()
            status = '映像受信中'
        } catch (error) {
            console.error('映像再生エラー:', error)
            status = '映像を再生するにはボタンを押してください'
        }
    }

    async function enableAudio() {
        videoElement.muted = false
        await playVideo()
    }

    async function reconnect() {
        status = '再接続中...'

        if (pc) {
            pc.close()
            pc = null
        }

        pendingCandidates.length = 0
        videoElement.srcObject = null

        await sendLeave(myId)
        await sendJoin(myId)
        status = '発信者を待機中...'
    }

    let status = $state('未接続')


    // ----------------------------------------
    // 初期化
    // ----------------------------------------

    onMount(async () => {

        try {

            status = 'Broadcast接続中...'


            await connectBroadcast(
                room,
                handleSignal
            )


            status = '発信者を待機中...'


            // 発信者に参加通知
            await sendJoin(myId)

        } catch (error) {

            console.error(error)

            status = error.message
        }
    })


    // ----------------------------------------
    // Broadcast受信
    // ----------------------------------------

    async function handleSignal(data) {

        console.log(
            'signal:',
            data
        )


        // 自分宛てではない
        if (data.to && data.to !== myId) {
            return
        }


        // Offer
        if (data.type === 'offer') {

            await receiveOffer(data)

            return
        }


        // ICE Candidate
        if (data.type === 'candidate') {

            if (!pc) {
                pendingCandidates.push(data)
                return
            }


            try {

                if (!pc.remoteDescription) {
                    pendingCandidates.push(data)
                    return
                }

                await pc.addIceCandidate(
                    new RTCIceCandidate(
                        data.candidate
                    )
                )

            } catch (error) {

                console.error(
                    'ICE Candidate error:',
                    error
                )
            }

            return
        }
    }


    // ----------------------------------------
    // Offer受信
    // ----------------------------------------

    async function receiveOffer(data) {

        status = 'Offer受信'


        // PeerConnection作成
        pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        })


        // ------------------------------------
        // 映像受信
        // ------------------------------------

        pc.ontrack = async (event) => {

            console.log(
                '映像受信:',
                event.streams[0]
            )


            if (
                event.streams &&
                event.streams[0]
            ) {

                videoElement.srcObject = event.streams[0] ?? new MediaStream([event.track])
                videoElement.muted = true
                playVideo()
            }
        }


        // ------------------------------------
        // ICE Candidate
        // ------------------------------------

        pc.onicecandidate = async (event) => {

            if (!event.candidate) {
                return
            }


            await sendCandidate(
                data.from,
                myId,
                event.candidate
            )
        }


        // ------------------------------------
        // 接続状態
        // ------------------------------------

        pc.onconnectionstatechange = () => {

            console.log(
                'connection:',
                pc.connectionState
            )


            if (
                pc.connectionState === 'connected'
            ) {

                status = '映像受信中'
            }


            if (
                pc.connectionState === 'disconnected'
            ) {

                status = '切断されました'
            }


            if (
                pc.connectionState === 'failed'
            ) {

                status = '接続失敗'
            }
        }


        // ------------------------------------
        // Offer設定
        // ------------------------------------

        await pc.setRemoteDescription(
            new RTCSessionDescription(
                data.sdp
            )
        )

        for (const candidate of pendingCandidates) {
            await pc.addIceCandidate(
                new RTCIceCandidate(candidate.candidate)
            )
        }
        pendingCandidates.length = 0


        // ------------------------------------
        // Answer作成
        // ------------------------------------

        const answer =
            await pc.createAnswer()


        await pc.setLocalDescription(
            answer
        )


        // ------------------------------------
        // Answer送信
        // ------------------------------------

        await sendAnswer(
            data.from,
            myId,
            pc.localDescription
        )


        status = '接続処理中...'
    }


    // ----------------------------------------
    // 終了
    // ----------------------------------------

    onDestroy(async () => {

        if (pc) {

            pc.close()

            pc = null
        }


        await sendLeave(myId)


        await disconnectBroadcast()
    })
</script>


<div class="container">

    <h1>カメラ受信</h1>

    <p>
        状態：{status}
    </p>

    <p>
        ID：{myId}
    </p>
    <button type="button" onclick={toggleFullscreen}>
        全画面表示
    </button>
    <button type="button" onclick={playVideo}>
        映像を再生
    </button>
    <button type="button" onclick={enableAudio}>
        音声を有効化
    </button>
    <button type="button" onclick={reconnect}>
        再接続
    </button>
    <video
        bind:this={videoElement}
        autoplay
        muted
        playsinline
        controls={false}
    ></video>
</div>


<style>
    .container {
        padding: 20px;
    }

    video {
        width: 100%;
        max-width: 800px;
        background: #000;
    }

    button {
        display: block;
        margin-top: 8px;
    }
</style>