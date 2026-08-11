const express = require('express');
const boxes = require('../../data/repos/boxes');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const { subject } = require('../../lib/ability');
const { ownersOfMachine } = require('../../lib/shopScope');

/**
 * `authorize()` only decides whether the role has any rule for the action —
 * conditional rules (supplier: own boxes; shop admin: boxes in their shops)
 * pass that check and have to be asserted against the actual document here.
 * Boxes inherit `vendorId`/`shopId` from their machine, so both scopes match
 * on the box row directly.
 */
const assertCanTouchBox = async (req, res, action, boxId) => {
    const box = await boxes.getById(boxId);
    if (!box) {
        res.status(404).json({ message: 'Box not found.' });
        return false;
    }
    if (req.ability.cannot(action, subject('Box', box))) {
        res.status(403).json({ message: 'Forbidden.' });
        return false;
    }
    return true;
};

/** Same check for the machine-wide box operations, using the machine's owners. */
const assertCanTouchMachineBoxes = async (req, res, action, machineId) => {
    const owners = await ownersOfMachine(machineId);
    if (req.ability.cannot(action, subject('Box', owners))) {
        res.status(403).json({ message: 'Forbidden.' });
        return false;
    }
    return true;
};

module.exports = () => {
    let router = express.Router();

    //create new box
    router.post('/boxes', authenticate(), authorize('create', 'Box'), async (req, res, next) => {
        try {
            // A box is created inside a machine — the machine decides who may.
            if (!(await assertCanTouchMachineBoxes(req, res, 'create', req.body.machineId))) return;
            let results = await boxes.create(req.body);
            return res.status(201).json(results);
        } catch (err) {
            next(err);
        }
    });

    //get all boxes
    router.get('/boxes', authenticate(), authorize('read', 'Box'), async (req, res, next) => {
        try {
            let results = await boxes.get(req.query.offset, req.query.limit, req.ability);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    //get box by id
    router.get('/boxes/:boxId', authenticate(), authorize('read', 'Box'), async (req, res, next) => {
        try {
            if (!(await assertCanTouchBox(req, res, 'read', req.params.boxId))) return;
            let results = await boxes.getById(req.params.boxId);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    //get all boxes by machineId
    router.get('/boxes/machine/:machineId', authenticate(), authorize('read', 'Box'), async (req, res, next) => {
        try {
            if (!(await assertCanTouchMachineBoxes(req, res, 'read', req.params.machineId))) return;
            let results = await boxes.getByMachineId(req.params.machineId);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    // Toggle box by boxId.
    router.put('/boxes/:boxId/toggle', authenticate(), authorize('update', 'Box'), async (req, res, next) => {
        try {
            if (!(await assertCanTouchBox(req, res, 'update', req.params.boxId))) return;
            let results = await boxes.toggle(req.params.boxId);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    // Update box by boxId.
    router.put('/boxes/:boxId', authenticate(), authorize('update', 'Box'), async (req, res, next) => {
        try {
            if (!(await assertCanTouchBox(req, res, 'update', req.params.boxId))) return;
            let results = await boxes.update(req.params.boxId, req.body);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    // Fill box with product.
    router.put('/boxes/:boxId/changeproduct', authenticate(), authorize('update', 'Box'), async (req, res, next) => {
        try {
            if (!(await assertCanTouchBox(req, res, 'update', req.params.boxId))) return;
            let results = await boxes.updateBox(req.params.boxId, req.body);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    // Fill box with product.
    router.put('/boxes/product/:productId/changeproduct', authenticate(), authorize('update', 'Box'), async (req, res, next) => {
        try {
            // Targets boxes on one machine; the machine is the authority.
            if (!(await assertCanTouchMachineBoxes(req, res, 'update', req.body.machineId))) return;
            let results = await boxes.fillProductInBox(req.params.productId, req.body);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    // Fill box with product.
    router.put('/boxes/machine/:machineId/unassign', authenticate(), authorize('update', 'Box'), async (req, res, next) => {
        try {
            if (!(await assertCanTouchMachineBoxes(req, res, 'update', req.params.machineId))) return;
            let results = await boxes.emptyBoxesByMachine(req.params.machineId);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    // delete box by boxId.
    router.delete('/boxes/:boxId', authenticate(), authorize('delete', 'Box'), async (req, res, next) => {
        try {
            if (!(await assertCanTouchBox(req, res, 'delete', req.params.boxId))) return;
            let results = await boxes.remove(req.params.boxId);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    // delete boxes by machineId.
    router.delete('/boxes/machine/:machineId', authenticate(), authorize('delete', 'Box'), async (req, res, next) => {
        try {
            if (!(await assertCanTouchMachineBoxes(req, res, 'delete', req.params.machineId))) return;
            let results = await boxes.removeByMachine(req.params.machineId);
            return res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    });

    return router;
}
