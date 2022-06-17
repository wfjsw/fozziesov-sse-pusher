const cluster = require('node:cluster')
const { cpus } = require('node:os')
const axios = require('axios')
const http = require('node:http')
const https = require('node:https')
const { axiosETAGCache } = require('axios-etag-cache')
const moment = require('moment')

const numCPUs = cpus().length;

const httpAgent = new http.Agent({ keepAlive: true })
const httpsAgent = new https.Agent({ keepAlive: true })

// let gMinTime = null
const workers = new Set()

for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    workers.add(worker)
}

cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    workers.delete(worker);
    const newWorker = cluster.fork();
    workers.add(newWorker)
});

async function getSovInfo() {
    // const now = moment.utc().unix();
    // if (gMinTime !== null && now < gMinTime - 5 * 60) {
    //     return
    // }

    try {
        const resp = await axiosETAGCache(axios)('https://esi.evetech.net/latest/sovereignty/campaigns/?datasource=tranquility', {
            httpAgent,
            httpsAgent,
            timeout: 2500,
        })
        const data = resp.data;
        const filteredData = data.map(n => ([
            n.campaign_id,
            n.defender_id,
            n.event_type,
            n.solar_system_id,
            moment.utc(n.start_time).unix(),
            n.defender_score
        ]))
        // const minTime = Math.min(...filteredData.map(n => n[4]))
        // gMinTime = minTime
        // if (now < minTime - 2 * 60) {
        //     return
        // }

        for (const wk of workers) {
            wk.send({
                type: "push",
                data: filteredData,
                time: Date.now(),
            })
        }
        console.log(`Received ${resp.data.length} campaigns`)
    } catch(e) {
        console.error(e);
    }

}

setInterval(getSovInfo, 5000);
