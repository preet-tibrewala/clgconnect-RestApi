const router = require('express').Router()
const { validateAgainstSchema, extractValidFields } = require('../lib/validation')
const { getDb } = require('../mongodb')
exports.router = router
const { ObjectId } = require('mongodb');
const e = require('express');
const bcrypt = require('bcrypt')
const userSchema = {
    name: { required: true },
    email: { required: true },
    password: { required: true },
    University: { required: true }
  }

/*
 * Route to add a user.

 */

router.post('/', async function(req, res, next) {
  const { name, email, password, University } = req.body;

  if (validateAgainstSchema(req.body, userSchema)) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const db = getDb();
      const usersCollection = db.collection('users');
  
      const result = await usersCollection.insertOne({ name, email, password: hashedPassword, University });
  
      res.status(201).send({ userId: result.insertedId });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }else {
    res.status(400).send({
      error: "Request body is not a valid user object."
    });
  }
  
});

/*
 * Route to get a user info.

 */

router.get('/:userid', async function(req, res, next) {


  const db = getDb();
  const usersCollection = db.collection('users');
  //const userid = parseInt(req.params.userid);
  const newUserId = new ObjectId(req.params.userid)

  try {
    const user = await usersCollection.findOne({ _id: newUserId }, { projection: { password: 0 } })
    if (user) {
      res.status(200).send(user)
    } else {
      res.status(404).send({ error: "User not found" });
    }

  } catch (err) {
    next(err)
  }  

})

/*
 * Route to update a user info.

 */

router.put('/:userid', async function(req, res, next) {

  const db = getDb();
  const usersCollection = db.collection('users');
  const newUserId = new ObjectId(req.params.userid)

  if (validateAgainstSchema(req.body, userSchema)) {
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const result = await usersCollection.updateOne({ _id: newUserId }, { $set: { name: req.body.name, email: req.body.email, password: hashedPassword, University: req.body.University } })
      res.status(200).send({ message : "User updated successfully" });
    } catch (err) {
      next(err);
    }
  } else {
    res.status(400).send({
      error: "Request body is not a valid user object."
    });
  }
})

/*
 * Route to delete a user.

 */

router.delete('/:userid', async function(req, res, next) {
  
    const db = getDb();
    const usersCollection = db.collection('users');
    const newUserId = new ObjectId(req.params.userid)
  
    try {
      const result = await usersCollection.deleteOne({ _id: newUserId })
      if (result.deletedCount > 0) {
        res.status(204).send({ message : "User deleted successfully" });
      }else {
        res.status(404).send({ error: "User not found" });
      }
    } catch (err) {
      next(err)
    }  
})

/*
  * Route to Get a list of all rental alerts of a specified user.
  
  */

router.get('/:userid/alerts', async function(req, res, next) {

  const db = getDb();
  const alertsCollection = db.collection('alerts');
  const newUserId = new ObjectId(req.params.userid)

  try {
    const alerts = await alertsCollection.find({ userID: newUserId }).toArray()
    if (alerts > 0) {
      res.status(200).send(alerts)
    } else {
      res.status(404).send({ error: "Alerts not found for the specified user" });
    }
  } catch (err) {
    next(err)
  }
})

router.get('/:userid/rentals', async function(req, res, next) {
  const db = getDb();
  const rentalsCollection = db.collection('rentals');
  const newUserId = new ObjectId(req.params.userid)
  try{
    const rentals = await rentalsCollection.find({ ownerId: newUserId }).toArray()
    if(rentals.length > 0){
      res.status(200).send(rentals)
    }else{
      res.status(404).send({ error: "Rentals Listings not found for the specified user" });
    }
  } catch (err) {
    next(err)
  }
})


router.get('/:userid/marketplace', async function(req, res, next) {
  const db = getDb();
  const marketplaceCollection = db.collection('marketplace');
  const newUserId = new ObjectId(req.params.userid)
  console.log(newUserId)
  try{
    const marketplace = await marketplaceCollection.find({ ownerId: newUserId }).toArray()
    console.log(marketplace)
    if(marketplace.length > 0){
      res.status(200).send(marketplace)
    }else{
      res.status(404).send({ error: "Marketplace Listings not found for the specified user" });
    }
  } catch (err) {
    next(err)
  }
})