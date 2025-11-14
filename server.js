// const express = require('express')
const http = require('node:http')
const SseStream = require("./ssestream");
const fs = require('node:fs')
const { diff } = require('./diff')

// const app = express()
const streamsTQ = new Set()
const streamsSR = new Set();
// const socketPath = process.env.SOCKET_PATH
const fd = parseInt(process.env.LISTEN_FD);
let latestTQ = null;
let latestSR = null;

function serveTQ(req, res) {
    if (!latestTQ) {
        res.writeHead(503);
        res.end();
        return;
    }

    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        // "Access-Control-Allow-Origin": "*",
    });
    res.flushHeaders();

    const stream = new SseStream(req);
    stream.pipe(res);
    streamsTQ.add(stream);

    stream.write({
        data: latestTQ.map((n) => n.slice(1)),
        event: "campaigns",
    });

    const ka = setInterval(
        () =>
            stream.write({
                comment: "ka",
            }),
        30000
    );

    res.on("close", () => {
        // console.log("lost connection");
        stream.unpipe(res);
        streamsTQ.delete(stream);
        clearInterval(ka);
    });
}

function serveSR(req, res) {
    if (!latestSR) {
        res.writeHead(503);
        res.end();
        return;
    }

    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        // "Access-Control-Allow-Origin": "*",
    });
    res.flushHeaders();

    const stream = new SseStream(req);
    stream.pipe(res);
    streamsSR.add(stream);

    stream.write({
        data: latestSR.map((n) => n.slice(1)),
        event: "campaigns",
    });

    const ka = setInterval(
        () =>
            stream.write({
                comment: "ka",
            }),
        30000
    );

    res.on("close", () => {
        // console.log("lost connection");
        stream.unpipe(res);
        streamsSR.delete(stream);
        clearInterval(ka);
    });
}


const app = http.createServer((req, res) => {
    // console.log('received connection')

    if (req.url === '/tq') {
        serveTQ(req, res)
    } 
    // else if (req.url === '/sr') {
    //     serveSR(req, res)
    // } 
    else {
        res.writeHead(404)
        res.end()
    }
})

// app.listen(socketPath, () => {
//     fs.chmodSync(socketPath, '664')
// })

app.listen({fd})

process.on('message', function (msg) {
    if (msg.type && msg.type === "push-tq") {
        if (JSON.stringify(latestTQ) === JSON.stringify(msg.data)) return;
        const oldLatest = latestTQ;
        latestTQ = msg.data;
        if (oldLatest) {
            const d = diff(oldLatest, latestTQ);
            if (d !== null) {
                for (const stream of streamsTQ) {
                    stream.write({
                        data: d,
                        event: "diff",
                    });
                }
            } else {
                const data = msg.data.map((n) => n.slice(1));
                for (const stream of streamsTQ) {
                    stream.write({
                        data,
                        event: "campaigns",
                    });
                }
            }
        }
    } 
    // else if (msg.type && msg.type === "push-sr") {
    //     if (JSON.stringify(latestSR) === JSON.stringify(msg.data)) return;
    //     const oldLatest = latestSR;
    //     latestSR = msg.data;
    //     if (oldLatest) {
    //         const d = diff(oldLatest, latestSR);
    //         if (d !== null) {
    //             for (const stream of streamsSR) {
    //                 stream.write({
    //                     data: d,
    //                     event: "diff",
    //                 });
    //             }
    //         } else {
    //             const data = msg.data.map((n) => n.slice(1));
    //             for (const stream of streamsSR) {
    //                 stream.write({
    //                     data,
    //                     event: "campaigns",
    //                 });
    //             }
    //         }
    //     }
    // }
})

