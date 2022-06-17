// const express = require('express')
const http = require('node:http')
const SseStream = require("./ssestream");
const fs = require('node:fs')

// const app = express()
const streams = new Set()
const socketPath = process.env.SOCKET_PATH
let latest = null;

const app = http.createServer((req, res) => {
    console.log('received connection')
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        // "Access-Control-Allow-Origin": "*",
    });
    res.flushHeaders();
    
    const stream = new SseStream(req);
    stream.pipe(res)
    streams.add(stream)

    if (latest) {
        stream.write({
            data: latest,
            event: 'campaigns',
        });
    }

    const ka = setInterval(() => stream.write({
        comment: 'ka'
    }), 30000)

    res.on('close', () => {
        console.log('lost connection')
        stream.unpipe(res)
        streams.delete(stream)
        clearInterval(ka)
    })
})

app.listen(socketPath, () => {
    fs.chmodSync(socketPath, '664')
})

process.on('message', function (msg) {
    if (msg.type && msg.type === 'push') {
        if (JSON.stringify(latest) === JSON.stringify(msg.data)) return;
        latest = msg.data;
        for (const stream of streams) {
            stream.write({
                data: msg.data,
                event: 'campaigns',
                // id: msg.time,
                // retry: 1,
            })
        }
    }
})
