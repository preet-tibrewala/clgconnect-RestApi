const router = require('express').Router()
const { validateAgainstSchema, extractValidFields } = require('../lib/validation')
const { generateAuthToken, requireAuthentication } = require('../lib/auth');
const { getDb } = require('../mongodb')
exports.router = router
const { ObjectId } = require('mongodb');
const e = require('express');
const bcrypt = require('bcrypt')
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');

const marketplaceSchema = {
    ownerId: { required: true },
    title: { required: true },
    price: { required: true },
    category: { required: true },
    description: { required: true }
}

const storage = multer.memoryStorage();

const imageSchema = {
    ownerId: { required: true },
    listingId: { required: true }
};
const imageTypes = {
    'image/jpeg': true,
    'image/png': true,
};
  
const fileFilter = (req, file, callback) => {
  if (imageTypes[file.mimetype]) {
    callback(null, true);
  } else {
    callback(new Error('File type not supported'), false);
  }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});

function uploadToGridFS(buffer, filename, mimetype, bucket) {
    return new Promise((resolve, reject) => {
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
  
      const uploadStream = bucket.openUploadStream(filename, {
        contentType: mimetype
      });
  
      readableStream.pipe(uploadStream)
        .on('error', (error) => reject(error))
        .on('finish', () => resolve(uploadStream.id));
    });

}

router.post('/', requireAuthentication, upload.array('image', 10), async function(req, res, next) {
  console.log('User:', req.user);
  console.log('Files:', req.files);
  console.log('Request body:', req.body);

  if (req.user.id !== req.body.ownerId) {
      return res.status(403).send({
          error: "Unauthorized to access the specified resource"
      });
  }

  const db = getDb();
  const marketplaceCollection = db.collection('marketplace');
  const bucket = new GridFSBucket(db, { bucketName: 'photos' });

  if (validateAgainstSchema(req.body, marketplaceSchema)) {
      try {
          const marketplaceItem = extractValidFields(req.body, marketplaceSchema);
          marketplaceItem.ownerId = new ObjectId(req.body.ownerId);
          marketplaceItem.TimeStamp = new Date();
          marketplaceItem.photos = [];

          console.log('Number of files:', req.files.length);

          if (req.files && req.files.length > 0) {
              for (const file of req.files) {
                  const fileId = await uploadToGridFS(file.buffer, file.originalname, file.mimetype, bucket);
                  console.log('Uploaded fileId:', fileId);
                  marketplaceItem.photos.push({
                      imageId: fileId,
                      filename: file.originalname,
                      contentType: file.mimetype,
                      url: `${req.protocol}://${req.get('host')}/marketplace/${fileId}/download`
                  });
              }
          }

          const result = await marketplaceCollection.insertOne(marketplaceItem);

          if (result.insertedId) {
              res.status(201).send({ itemID: result.insertedId });
          } else {
              next();
          }
      } catch (err) {
          console.error("Error during marketplace item creation:", err);
          next(err);
      }
  } else {
      res.status(400).send({
          error: "Request body is not a valid marketplace item object."
      });
  }
});



router.get('/:fileId/download', async function(req, res, next) {
    const db = getDb();
    const bucket = new GridFSBucket(db, {
      bucketName: 'photos'
    });
  
    const fileId = new ObjectId(req.params.fileId);
  
    try {
      const downloadStream = bucket.openDownloadStream(fileId);
  
      downloadStream.on('file', (file) => {
        res.set('Content-Type', file.contentType);
        res.set('Content-Disposition', `attachment; filename="${file.filename}"`);
      });
  
      downloadStream.on('error', (err) => {
        res.status(404).send({ error: 'File not found' });
      });
  
      downloadStream.pipe(res);
    } catch (err) {
      next(err);
    }
});

router.get('/:itemId', requireAuthentication, async function(req, res, next) {
    const db = getDb();
    const marketplaceCollection = db.collection('marketplace');
    const itemId = new ObjectId(req.params.itemId);
  
    try {
      const item = await marketplaceCollection.findOne({ _id: itemId });
      if (item) {
        if(item.ownerId != req.user.id){
          res.status(403).send({
            error: "Unauthorized to access the specified resource"
          });
        }else{
          res.status(200).send(item);
        }
      } else {
        next();
      }
    } catch (err) {
      next(err);
    }
});
  
router.get('/', async function(req, res, next) {
    const db = getDb();
    const marketplaceCollection = db.collection('marketplace');
    try {
        const items = await marketplaceCollection.find({}).toArray();
        res.status(200).send(items);
    } catch (err) {
        next(err);
    }
})

updateReqSchema = {
    title: { required: true },
    price: { required: true },
    category: { required: true },
    description: { required: true }
}

router.patch('/:itemId', requireAuthentication, async function(req, res, next) {
  console.log(req.body);
  const isValid = validateAgainstSchema(req.body, updateReqSchema);
  console.log(isValid);
  if (isValid) {
      try {
          const db = getDb();
          const marketplaceCollection = db.collection('marketplace');
          const itemId = new ObjectId(req.params.itemId);
          const marketplaceItem = extractValidFields(req.body, updateReqSchema);
          marketplaceItem.TimeStamp = new Date();
          
          // Check if the authenticated user is the owner of the item
          const item = await marketplaceCollection.findOne({ _id: itemId });
          if (item && item.ownerId.toString() === req.user.id) {
              const result = await marketplaceCollection.updateOne({ _id: itemId }, { $set: marketplaceItem });
              if (result.matchedCount > 0) {
                  res.status(200).send();
              } else {
                  next();
              }
          } else {
              res.status(403).send({
                  error: "Unauthorized to access the specified resource"
              });
          }
      } catch (err) {
          next(err);
      }
  } else {
      res.status(400).send({
          error: "Request body is not a valid marketplace item object."
      });
  }
});

router.delete('/:itemId', requireAuthentication, async function(req, res, next) {
  const db = getDb();
  const marketplaceCollection = db.collection('marketplace');
  const itemId = new ObjectId(req.params.itemId);

  try {

    const item = await marketplaceCollection.findOne({ _id: itemId });
    console.log(item);
    if(item){
      const userIdObject = new ObjectId(req.user.id);
      if (!item.ownerId.equals(userIdObject)){
        res.status(403).send({
          error: "Unauthorized to access the specified resource"
        });
      } else{
        const result = await marketplaceCollection.deleteOne({ _id: itemId });
        if (result.deletedCount > 0) {
          res.status(204).send();
        } else {
          next();
        }
      }
    } else{
      next();
    }
  } catch (err) {
    next(err);
  }
});