const express = require('express');
const boxes = require('../../data/repos/boxes');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');


module.exports = () => {
    let router = express.Router();

    //create new box
    router.post('/boxes', authenticate(), authorize('create', 'Box'), async (req, res, next) => {
        try {
            let results = await boxes.create(req.body);
            return res.status(201).json(results);
        } catch (err) {
            next(err);
        }
    });

    //get all boxes
    router.get('/boxes', authenticate(), authorize('read', 'Box'), async (req, res, next) => {
        try {
            let results = await boxes.get(req.query.offset, req.query.limit);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    //get box by id
    router.get('/boxes/:boxId', authenticate(), authorize('read', 'Box'), async (req, res, next) => {
        try {
            let results = await boxes.getById(req.params.boxId);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    //get all boxes by machineId
    router.get('/boxes/machine/:machineId', authenticate(), authorize('read', 'Box'), async (req, res, next) => {
        try {
            let results = await boxes.getByMachineId(req.params.machineId);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    // Toggle box by boxId.
    router.put('/boxes/:boxId/toggle', authenticate(), authorize('update', 'Box'), async (req, res, next) => {
        try {
            let results = await boxes.toggle(req.params.boxId);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    // Update box by boxId.
    router.put('/boxes/:boxId', authenticate(), authorize('update', 'Box'), async (req, res, next) => {
        try {
            let results = await boxes.update(req.params.boxId, req.body);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    // Fill box with product.
    router.put('/boxes/:boxId/changeproduct', authenticate(), authorize('update', 'Box'), async (req, res, next) => {
        try {
            let results = await boxes.updateBox(req.params.boxId, req.body);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    // Fill box with product.
    router.put('/boxes/product/:productId/changeproduct', authenticate(), authorize('update', 'Box'), async (req, res, next) => {
        try {
            let results = await boxes.fillProductInBox(req.params.productId, req.body);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    // Fill box with product.
    router.put('/boxes/machine/:machineId/unassign', authenticate(), authorize('update', 'Box'), async (req, res, next) => {
        try {
            let results = await boxes.emptyBoxesByMachine(req.params.machineId);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    // delete box by boxId.
    router.delete('/boxes/:boxId', authenticate(), authorize('delete', 'Box'), async (req, res, next) => {
        try {
            let results = await boxes.remove(req.params.boxId);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    // delete boxes by machineId.
    router.delete('/boxes/machine/:machineId', authenticate(), authorize('delete', 'Box'), async (req, res, next) => {
        try {
            let results = await boxes.removeByMachine(req.params.machineId);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    return router;
}