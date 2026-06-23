const express = require('express');
const events = require('../../data/repos/events');
const authenticate = require('../middlewares/authenticate');


module.exports = () => {
    let router = express.Router();

    //get all Clients
    router.get('/clients/status', authenticate(), async (req, res, next) => {
        try {
            let results = await events.updateConnectivityStatus();
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    return router;
}