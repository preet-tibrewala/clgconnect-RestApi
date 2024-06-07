const router = require('express').Router()
const { validateAgainstSchema, extractValidFields } = require('../lib/validation')
const { getDb } = require('../mongodb')
const { generateAuthToken, requireAuthentication } = require('../lib/auth');
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

router.post('/', requireAuthentication, async function(req, res, next) {
    if(req.user.id !== req.body.userID){
        res.status(403).send({
            error: "Unauthorized to access the specified resource"
        });
    }else{
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
    }
})

/*
    * Route to get a alert info.
    */

router.get('/:alertId', requireAuthentication, async function(req, res, next) {
   
    const db = getDb();
    const alertsCollection = db.collection('alerts');
    const alertId = new ObjectId(req.params.alertId);
    try {
        const alert = await alertsCollection.findOne({ _id: alertId });
        if (alert) {
            if(alert.userID != req.user.id){
                res.status(403).send({
                    error: "Unauthorized to access the specified resource"
                });
            }else{
                res.status(200).send(alert);
            }
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

router.put('/:alertId', requireAuthentication, async function(req, res, next) {
    if(req.user.id !== req.body.userID){
        res.status(403).send({
            error: "Unauthorized to access the specified resource"
        });
    }else{
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
    }
})

/*
    * Route to delete a alert.
    */

router.delete('/:alertId', requireAuthentication, async function(req, res, next) {
    const db = getDb();
    const alertsCollection = db.collection('alerts');
    const alertId = new ObjectId(req.params.alertId);

    try {
        const alert = await alertsCollection.findOne({ _id: alertId });
        if (alert) {
            if (alert.userID == req.user.id) {
                const result = await alertsCollection.deleteOne({ _id: alertId });
                if (result.deletedCount > 0) {
                    res.status(200).send({ message: "Alert deleted successfully." });
                } else {
                    next();
                }
            } else {
                res.status(403).send({
                    error: "Unauthorized to access the specified resource"
                });
            }
        } else {
            next();
        }
    } catch (err) {
        next(err);
    }
})

