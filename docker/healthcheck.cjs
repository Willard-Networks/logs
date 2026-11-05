// Probe the local listener without depending on curl in the slim image.
const secure = process.env.SSL === 'true';
const transport = require(secure ? 'node:https' : 'node:http');
const request = transport.get({
    hostname: '127.0.0.1',
    port: process.env.PORT || 3000,
    path: '/',
    // This loopback liveness probe also supports locally supplied self-signed certs.
    // It is not a certificate or external availability check.
    rejectUnauthorized: false,
}, response => {
    response.resume();
    process.exitCode = response.statusCode === 200 ? 0 : 1;
});
request.setTimeout(5000, () => request.destroy(new Error('Health check timed out')));
request.on('error', () => { process.exitCode = 1; });
