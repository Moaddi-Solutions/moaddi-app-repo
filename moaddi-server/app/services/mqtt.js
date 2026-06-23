const mqtt = require('mqtt');
const path = require('path');
const fs = require('fs');
const config = require('../../config');
const eventsRepo = require('../data/repos/events');

function readTlsPemOptional(envPath) {
    if (envPath == null || String(envPath).trim() === '') return undefined;
    const p = path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), String(envPath).trim());
    return fs.readFileSync(p);
}

const clientId = 'application-' + Math.random().toString(16).substring(2, 8)
const sni =
    typeof config.mqtt.tlsServername === 'string' &&
    config.mqtt.tlsServername.trim() !== ''
        ? config.mqtt.tlsServername.trim()
        : undefined

const ca = readTlsPemOptional(config.mqtt.tlsCafile);
const certPath = config.mqtt.tlsClientCert && String(config.mqtt.tlsClientCert).trim();
const keyPath = config.mqtt.tlsClientKey && String(config.mqtt.tlsClientKey).trim();
let cert;
let key;
if (certPath && keyPath) {
    cert = readTlsPemOptional(certPath);
    key = readTlsPemOptional(keyPath);
} else if (certPath || keyPath) {
    console.warn(
        '[MQTT] Set both MQTT_TLS_CLIENT_CERT and MQTT_TLS_CLIENT_KEY for mTLS; client cert disabled.',
    );
}

const options = {
    host: config.mqtt.host,
    port: config.mqtt.port,
    protocol: 'mqtts',
    username: config.mqtt.username,
    password: config.mqtt.password,
    clientId: clientId,
    ...(ca ? { ca } : {}),
    ...(cert && key ? { cert, key } : {}),
    ...(sni ? { servername: sni } : {}),
    reconnectPeriod: 5000,   // retry every 5 seconds
    connectTimeout: 30000,   // slow networks / broker load can exceed 10s
    queueQoSZero: false,     // don't queue messages when offline
}
const client = mqtt.connect(options);

const verifyLabel = ca ? 'custom CA (MQTT_TLS_CAFILE)' : "system default CAs (public brokers e.g. Let's Encrypt)";
const clientAuthLabel = cert && key ? 'mTLS + password' : 'password only';
console.log(
    '[MQTT] Endpoint mqtts://' +
        (config.mqtt.host || '(missing MQTT_HOST)') +
        ':' +
        (config.mqtt.port || '?') +
        (sni ? ' SNI=' + sni : '') +
        ' | TLS: ' +
        verifyLabel +
        ' | client: ' +
        clientAuthLabel +
        ' (clientId ' +
        clientId +
        ')',
);

// const client = {publish: function(){},on: function(){}, }


// MQTT client error event
client.on('error', (error) => {
    console.error('MQTT client connection error:', error.message);
});

client.on('offline', () => {
    console.warn('[MQTT] Client offline (socket closed or network lost)');
});

client.on('reconnect', () => {
    console.warn('[MQTT] Reconnect attempt…');
});

// MQTT client connect event
client.on('connect', async () => {
    console.log('MQTT Connected');

    await client.subscribe('DeviceData');
    await client.subscribe('$SYS/#');
})

// MQTT client disconnect event
client.on('close', () => {
    console.log('MQTT client disconnected.');
});

const messageHandler = async (topic, message) => {
    let clientId = message.toString();
    // console.log('\n[MQTT Received] Topic:', topic, ', ClientId:', clientId);

    if (topic === 'DeviceData')
        await eventsRepo.create(JSON.parse(clientId));

    if (topic.startsWith('$SYS/') && clientId.split('-')[0] == 'device') {
        
        let status = 0;
        let machineId = clientId.split('-')[1];
        if (topic.endsWith('/new/clients'))
            status = 1;
        else if (topic.endsWith('/disconnect/clients'))
            status = 0;

        console.log('\n[Device Connection] MachineId:', machineId, ', Status:', status);

        try {
            await eventsRepo.updateConnection(machineId, status);
        } catch (err) {
            const msg = err && err.message ? err.message : String(err);
            if (err && err.statusCode === 404) {
                console.warn('[Device Connection] Skipping DB update —', msg, '(', machineId, ')');
            } else {
                console.error('[Device Connection] updateConnection failed:', msg);
            }
        }
    }
}

client.on('message', messageHandler)

let sendToDevice = async (topic, message) => {
    if (!client.connected) {
        throw new Error('MQTT broker is not connected');
    }

    console.log('\n[MQTT Sending] data to Device message:', message)

    let data = JSON.stringify(message);

    await client.publish(topic, data);
}

// simulate device message 
/* --------------------------------------------------------------------------------------- */
/* --------------------------------------------------------------------------------------- */
/* --------------------------------------------------------------------------------------- */
let cache = {
    DeviceData: '',
    SYS: ''
}
setInterval(() => {
    const deviceData = fs.readFileSync('app/services/test/DeviceData.json').toString()
    const sys = fs.readFileSync('app/services/test/SYS.json').toString()
    if(deviceData != cache.DeviceData){
        cache.DeviceData = deviceData
        messageHandler('DeviceData',deviceData)
    }
    if(sys != cache.SYS){
        cache.SYS = sys
        const {topic, message} = JSON.parse(sys)
        messageHandler(topic, message)
    }
}, 1000)
/* --------------------------------------------------------------------------------------- */
/* --------------------------------------------------------------------------------------- */
/* --------------------------------------------------------------------------------------- */
module.exports = {
    sendToDevice,
    messageHandler
};