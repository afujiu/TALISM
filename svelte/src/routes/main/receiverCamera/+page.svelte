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

    let videoElement

    let pc = null
    const pendingCandidates = []

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

        pc.ontrack = (event) => {

            console.log(
                '映像受信:',
                event.streams[0]
            )


            if (
                event.streams &&
                event.streams[0]
            ) {

                videoElement.srcObject =
                    event.streams[0]
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

    <video
        bind:this={videoElement}
        autoplay
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
</style>