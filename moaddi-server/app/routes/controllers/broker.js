const express = require('express');
const certificatesRepo = require('../../data/repos/certificates');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

module.exports = () => {
    let router = express.Router();

    // generat certificates by deviceId.
    // Mints mTLS client keys for arbitrary machines — staff who fully manage
    // machines only (Shop Admin / Super Admin). A supplier's Machine rule is
    // ownership-scoped, so `manage` fails for them.
    router.post('/broker/generatecerts', authenticate(), authorize('manage', 'Machine'), async (req, res, next) => {
        try {
            const content = await certificatesRepo.generateClientKeysCertificates(req.body.machineIds);

            res.setHeader('Content-disposition', 'attachment; filename=certificates.zip');
            res.setHeader('Content-type', 'application/zip');
            res.end(content, 'binary');

        } catch (err) {
            next(err);
        }
    });

    return router;
}
