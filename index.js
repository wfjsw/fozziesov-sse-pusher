const cluster = require('node:cluster')
// const fs = require('node:fs')

// const socketPath = process.env.SOCKET_PATH

if (!cluster.isPrimary) {
    import('./server.js')
} else {
    // if (fs.existsSync(socketPath)) {
    //     fs.unlinkSync(socketPath);
    // }

    import('./master.js')
}

