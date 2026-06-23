const fs = require('fs');
const forge = require('node-forge');
const JSZip = require('jszip');

const attrsCA = [{
    name: 'commonName',
    value: '45.149.206.229'
}, {
    name: 'countryName',
    value: 'Pakistan'
}, {
    shortName: 'ST',
    value: 'PK'
}, {
    name: 'localityName',
    value: 'Karachi'
}, {
    name: 'organizationName',
    value: 'Moaddi'
}, {
    shortName: 'OU',
    value: 'Certificate Authority'
}];

function generateCA() {
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 100);
    cert.setSubject(attrsCA);
    cert.setIssuer(attrsCA);
    cert.setExtensions([{
        name: 'basicConstraints',
        cA: true
    }, {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true
    }, {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: true
    }, {
        name: 'nsCertType',
        client: true,
        server: true
    }]);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    return {
        privateKey: forge.pki.privateKeyToPem(keys.privateKey),
        certificate: forge.pki.certificateToPem(cert)
    };
}

function generateCertificate(commonName, isServer) {
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 100);
    const attrs = [{
        name: 'commonName',
        value: commonName
    }, {
        name: 'countryName',
        value: 'Pakistan'
    }, {
        shortName: 'ST',
        value: 'PK'
    }, {
        name: 'localityName',
        value: 'Karachi'
    }, {
        name: 'organizationName',
        value: 'Moaddi'
    }, {
        shortName: 'OU',
        value: isServer ? 'Server' : 'Client'
    }];
    cert.setSubject(attrs);
    cert.setIssuer(attrsCA);

    // // Add SAN (Subject Alternative Name) extension for IP or DNS
    // const altNames = [
    //     { type: 2, value: commonName }, // DNS name if commonName is a domain
    //     { type: 7, ip: commonName }     // IP address if commonName is an IP
    // ];

    cert.setExtensions([{
        name: 'basicConstraints',
        cA: false
    }, {
        name: 'keyUsage',
        keyEncipherment: true,
        digitalSignature: true,
        nonRepudiation: true,
        dataEncipherment: true,
        keyAgreement: true
    }, {
        name: 'extKeyUsage',
        serverAuth: isServer,
        clientAuth: !isServer
    }, {
        name: 'nsCertType',
        server: isServer,
        client: !isServer
        // }, {
        //     name: 'subjectAltName',
        //     altNames: altNames
    }]);
    const caKey = fs.readFileSync('ca-key.pem');
    const caKeyObject = forge.pki.privateKeyFromPem(caKey);
    cert.sign(caKeyObject, forge.md.sha256.create());
    return {
        privateKey: forge.pki.privateKeyToPem(keys.privateKey),
        certificate: forge.pki.certificateToPem(cert)
    };
}

// // Generate CA
// const caKeys = generateCA();
// fs.writeFileSync('ca-key.pem', caKeys.privateKey);
// fs.writeFileSync('ca-crt.pem', caKeys.certificate);

// // Generate Server Certificate
// const serverKeys = generateCertificate('localhost', true);
// const serverKeys = generateCertificate('45.149.206.229', true);
// fs.writeFileSync('server-key.pem', serverKeys.privateKey);
// fs.writeFileSync('server-crt.pem', serverKeys.certificate);

const generateClientKeysCertificates = async (machineIds) => {
    try {
        machineIds = Array.isArray(machineIds) ? machineIds : [machineIds];

        const zip = new JSZip();
        machineIds.forEach((machineId) => {
            const { certificate, privateKey } = generateCertificate(machineId, false);

            zip.folder(machineId).file(`client-certificate.pem`, certificate);
            zip.folder(machineId).file(`client-key.pem`, privateKey);
            zip.folder(machineId).file('server-certificate-CA.pem', fs.readFileSync(`${__dirname}/../../../ca-crt.pem`));
        });

        const content = await zip.generateAsync({ type: 'nodebuffer' });
        return content
    } catch (error) {
        throw error;
    }
};

module.exports = {
    generateCA,
    generateClientKeysCertificates,
}
