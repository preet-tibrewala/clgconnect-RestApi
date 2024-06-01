const router = require('express').Router()
const { validateAgainstSchema, extractValidFields } = require('../lib/validation')
const { getDb } = require('../mongodb')
exports.router = router
const { ObjectId, Timestamp } = require('mongodb');
const e = require('express');

const alertSchema = {
    userID: { required: true },
    Title: { required: true },
    Max_Price: { required: true },
    City: { required: true },
    Bedroom_available: { required: true },
    Total_Bedrooms: { required: true },
    Total_Baths: { required: true },
    Parking: { required: true },
    Pets: { required: true },
    Gender_preference: { required: true },
    Property_type: { required: true },
}


/*
    * Route to add a alert.
    */

router.post('/', async function(req, res, next) {
    
    if (validateAgainstSchema(req.body, alertSchema)) {
        try {
            const rentalAlert = extractValidFields(req.body, alertSchema);
            rentalAlert.userID = new ObjectId(req.body.userID);
            const db = getDb();
            const alertsCollection = db.collection('alerts');

            const result = await alertsCollection.insertOne(rentalAlert);

            res.status(201).send({ alertId: result.insertedId });
        } catch (err) {
            next(err);
        }
    }else {
        res.status(400).send({
            error: "Request body is not a valid alert object."
        });
    }
})

/*
    * Route to get a alert info.
    */

router.get('/:alertId', async function(req, res, next) {

    const db = getDb();
    const alertsCollection = db.collection('alerts');
    const alertId = new ObjectId(req.params.alertId);

    try {
        const alert = await alertsCollection.findOne({ _id: alertId });
        if (alert) {
            res.status(200).send(alert);
        } else {
            next();
        }
    } catch (err) {
        next(err);
    }

})

/*
    * Route to update a alert.
    */

router.put('/:alertId', async function(req, res, next) {

    if (validateAgainstSchema(req.body, alertSchema)) {
        try {
            const db = getDb();
            const alertsCollection = db.collection('alerts');
            const alertId = new ObjectId(req.params.alertId);
            const rentalAlert = extractValidFields(req.body, alertSchema);
            rentalAlert.userID = new ObjectId(req.body.userID);

            const result = await alertsCollection.replaceOne({ _id: alertId }, rentalAlert);
            if (result.matchedCount > 0) {
                res.status(200).send({ message: "Alert updated successfully." });
            } else {
                next();
            }
        } catch (err) {
            next(err);
        }
    } else {
        res.status(400).send({
            error: "Request body is not a valid alert object."
        });
    }

})

/*
    * Route to delete a alert.
    */

router.delete('/:alertId', async function(req, res, next) {
    
        const db = getDb();
        const alertsCollection = db.collection('alerts');
        const alertId = new ObjectId(req.params.alertId);
    
        try {
            const result = await alertsCollection.deleteOne({ _id: alertId });
            if (result.deletedCount > 0) {
                res.status(200).send({message: "Alert deleted successfully."});
            } else {
                next();
            }
        } catch (err) {
            next(err);
        }
})

