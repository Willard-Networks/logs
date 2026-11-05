const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const https = require('node:https');
const http = require('node:http');
const path = require('node:path');
const { test } = require('node:test');

async function probe(server, env = {}) {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        return await new Promise((resolve, reject) => {
            const child = spawn(process.execPath, [path.join(__dirname, 'healthcheck.cjs')], {
                env: { ...process.env, SSL: 'false', PORT: String(server.address().port), ...env },
                stdio: 'ignore',
            });
            child.once('error', reject);
            child.once('exit', resolve);
        });
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
}

test('accepts a successful HTTP response on the configured port', async () => {
    assert.equal(await probe(http.createServer((req, res) => res.end('OK'))), 0);
});

test('accepts HTTPS with a self-signed local certificate', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'logs-health-'));
    try {
        const key = path.join(dir, 'key.pem');
        const cert = path.join(dir, 'cert.pem');
        execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
            '-keyout', key, '-out', cert, '-days', '1', '-subj', '/CN=localhost'],
            { stdio: 'ignore' });
        const server = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) },
            (req, res) => res.end('OK'));
        assert.equal(await probe(server, { SSL: 'true' }), 0);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('rejects a server error', async () => {
    assert.equal(await probe(http.createServer((req, res) => {
        res.writeHead(503);
        res.end();
    })), 1);
});

test('fails a stalled request within the healthcheck timeout', async () => {
    const start = Date.now();
    assert.equal(await probe(http.createServer(() => {})), 1);
    assert.ok(Date.now() - start < 9000);
});
