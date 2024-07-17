// [
//     n.campaign_id,
//     n.defender_id,
//     n.event_type,
//     n.solar_system_id,
//     moment.utc(n.start_time).unix(),
//     n.defender_score,
// ];

exports.diff = (lt, rt) => {
    // [shift, ctr]
    // [chg, off, val]
    // [push, data]
    const diff = []
    if (rt.length > 0) {
        const rtLeftID = rt[0][0];
        const ltCorrID = lt.findIndex(n => n[0] === rtLeftID);
        if (ltCorrID > 0) {
            diff.push([0, ltCorrID])
            lt = lt.slice(ltCorrID)
        } else if (ltCorrID < 0) {
            // not found in left. no point in diffing
            return null
        }
    } else if (lt.length > 0) {
        diff.push([0, lt.length])
        lt = []
    }

    for (let i = 0; i < lt.length; i++) {
        const ltLeftID = lt[i][0];
        const rtExists = rt.some(n => n[0] === ltLeftID);
        if (!rtExists) {
            diff.push([3, i])
        }
    }

    for (let i = 0; i < rt.length; i++) {
        const rtID = rt[i][0];
        const ltID = lt.findIndex(n => n[0] === rtID);
        if (ltID >= 0) {
            if (lt[ltID][5] !== rt[i][5]) {
                diff.push([1, i, rt[i][5]])
            }
        } else if (ltID < 0) {
            diff.push([2, rt[i].slice(1)])
        }
    }

    return diff
};
