const express = require('express');
const certificatesRepo = require('../../data/repos/certificates');

module.exports = () => {
    let router = express.Router();

    // generat certificates by deviceId.
    router.post('/broker/generatecerts', async (req, res, next) => {
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
