const cluster = require('node:cluster')
const { cpus } = require('node:os')
const axios = require('axios')
const http = require('node:http')
const https = require('node:https')
const { axiosETAGCache } = require('axios-etag-cache')
const moment = require('moment')
const {getSocketActivationFds} = require('./systemd')

// const numCPUs = cpus().length;

const httpAgent = new http.Agent({ keepAlive: true })
const httpsAgent = new https.Agent({ keepAlive: true })

const [fd] = getSocketActivationFds();

// let gMinTime = null
const workers = new Set()

for (let i = 0; i < 8; i++) {
    const worker = cluster.fork({LISTEN_FD: fd});
    workers.add(worker)
}

cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    workers.delete(worker);
    const newWorker = cluster.fork({LISTEN_FD: fd});
    workers.add(newWorker)
});

async function fetchTQSovInfo() {
    try {
        const campaignsResp = await axiosETAGCache(axios)(
            "https://esi.evetech.net/latest/sovereignty/campaigns/?datasource=tranquility",
            {
                httpAgent,
                httpsAgent,
            }
        );
        const campaigns = campaignsResp.data;

        const filtered = campaigns
            .map((n) => [
                n.campaign_id,
                n.defender_id,
                n.event_type.replace(/_defense/, "").toUpperCase(),
                n.solar_system_id,
                moment.utc(n.start_time).unix(),
                n.defender_score,
            ])
            .sort((a, b) => a[4] - b[4]);
        // const minTime = Math.min(...filteredData.map(n => n[4]))
        // gMinTime = minTime
        // if (now < minTime - 2 * 60) {
        //     return
        // }

        for (const wk of workers) {
            wk.send({
                type: "push-tq",
                data: filtered,
                time: Date.now(),
            });
        }
        // console.log(`Received ${campaigns.length} campaigns (TQ)`);
    } catch(e) {
        console.error(e.message)
    } finally {
        setTimeout(fetchTQSovInfo, 5000)
    }
}

async function fetchSRSovInfo() {
    try {
        const campaignsResp = await axiosETAGCache(axios)(
            "https://esi.evepc.163.com/latest/sovereignty/campaigns/?datasource=serenity",
            {
                httpAgent,
                httpsAgent,
            }
        );
        const campaigns = campaignsResp.data;

        const filtered = campaigns
            .map((n) => [
                n.campaign_id,
                n.defender_id,
                n.event_type.replace(/_defense/, "").toUpperCase(),
                n.solar_system_id,
                moment.utc(n.start_time).unix(),
                n.defender_score,
            ])
            .sort((a, b) => a[4] - b[4]);
        // const minTime = Math.min(...filteredData.map(n => n[4]))
        // gMinTime = minTime
        // if (now < minTime - 2 * 60) {
        //     return
        // }

        for (const wk of workers) {
            wk.send({
                type: "push-sr",
                data: filtered,
                time: Date.now(),
            });
        }
        // console.log(`Received ${campaigns.length} campaigns (SR)`);
    } catch (e) {
        console.error(e.message)
    } finally {
        setTimeout(fetchSRSovInfo, 5000)
    }

}

// async function getSovInfo() {
//     // const now = moment.utc().unix();
//     // if (gMinTime !== null && now < gMinTime - 5 * 60) {
//     //     return
//     // }

//     try {
//         Promise.all([fetchTQSovInfo(), fetchSRSovInfo()])
//     } catch(e) {
//         console.error(e.message);
//     }

// }

// setInterval(() => fetchTQSovInfo().catch(e => console.error(e.message)), 5000);
// setInterval(() => fetchSRSovInfo().catch(e => console.error(e.message)), 10000);

fetchTQSovInfo()
// fetchSRSovInfo()

