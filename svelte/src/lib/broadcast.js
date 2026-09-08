import { supabase } from '$lib/supabase.js'

let channel = null

// ----------------------------------------
// Broadcast接続
// ----------------------------------------
export async function connectBroadcast(room, callback) {

    if (channel) {
        await disconnectBroadcast()
    }

    channel = supabase
        .channel(room)
        .on(
            'broadcast',
            { event: 'signal' },
            ({ payload }) => {
                console.log('Broadcast受信:', payload)
                if (callback) callback(payload)
            }
        )

    await new Promise((resolve, reject) => {
        channel.subscribe((status, error) => {
            console.log('Broadcast status:', status)

            if (status === 'SUBSCRIBED') {
                resolve()
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                reject(error ?? new Error(`Broadcast接続失敗: ${status}`))
            }
        })
    })

    return channel
}


// ----------------------------------------
// Offer送信
// ----------------------------------------
export async function sendOffer(to, from, sdp) {

    return sendSignal({
        type: 'offer',
        to,
        from,
        sdp
    })
}


// ----------------------------------------
// Answer送信
// ----------------------------------------
export async function sendAnswer(to, from, sdp) {

    return sendSignal({
        type: 'answer',
        to,
        from,
        sdp
    })
}


// ----------------------------------------
// ICE Candidate送信
// ----------------------------------------
export async function sendCandidate(to, from, candidate) {

    return sendSignal({
        type: 'candidate',
        to,
        from,
        candidate
    })
}


// ----------------------------------------
// Join通知
// ----------------------------------------
export async function sendJoin(peerId) {

    return sendSignal({
        type: 'join',
        from: peerId
    })
}


// ----------------------------------------
// Leave通知
// ----------------------------------------
export async function sendLeave(peerId) {

    return sendSignal({
        type: 'leave',
        from: peerId
    })
}


// ----------------------------------------
// シグナリング送信
// ----------------------------------------
async function sendSignal(payload) {

    if (!channel) {

        return {
            ok: false,
            message: 'Broadcastに接続されていません'
        }
    }

    const { error } = await channel.send({
        type: 'broadcast',
        event: 'signal',
        payload
    })

    if (error) {

        console.error(error)

        return {
            ok: false,
            message: error.message
        }
    }

    return {
        ok: true
    }
}


// ----------------------------------------
// Broadcast切断
// ----------------------------------------
export async function disconnectBroadcast() {

    if (!channel) {
        return
    }

    await supabase.removeChannel(channel)

    channel = null
}