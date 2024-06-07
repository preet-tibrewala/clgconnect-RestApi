const router = require('express').Router()
const { validateAgainstSchema, extractValidFields } = require('../lib/validation')
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

router.post('/', upload.array('image', 10), async function(req, res, next) {
    console.log(req.body);
    const db = getDb();
    const marketplaceCollection = db.collection('marketplace');
    const bucket = new GridFSBucket(db, {
      bucketName: 'photos'
    });

    if (validateAgainstSchema(req.body, marketplaceSchema)) {
      try {
        const marketplaceItem = extractValidFields(req.body, marketplaceSchema);
        marketplaceItem.ownerId = new ObjectId(req.body.ownerId);
        marketplaceItem.TimeStamp = new Date();
        marketplaceItem.photos = [];

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
              const fileId = await uploadToGridFS(file.buffer, file.originalname, file.mimetype, bucket);
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
        console.error("  -- error:", err);
        next(err);
      }
    } else {
      res.status(400).send({
        error: "Request body is not a valid marketplace item object."
      });
    }
})
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

router.get('/:itemId', async function(req, res, next) {
    const db = getDb();
    const marketplaceCollection = db.collection('marketplace');
    const itemId = new ObjectId(req.params.itemId);
  
    try {
      const item = await marketplaceCollection.findOne({ _id: itemId });
      if (item) {
        res.status(200).send(item);
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

router.patch('/:itemId', async function(req, res, next) {
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
            const result = await marketplaceCollection.updateOne({ _id: itemId }, { $set: marketplaceItem });
            if (result.matchedCount > 0) {
                res.status(200).send();
            } else {
                next();
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

router.delete('/:itemId', async function(req, res, next) {
    const db = getDb();
    const marketplaceCollection = db.collection('marketplace');
    const itemId = new ObjectId(req.params.itemId);
  
    try {
      const result = await marketplaceCollection.deleteOne({ _id: itemId });
      if (result.deletedCount > 0) {
        res.status(204).send();
      } else {
        next();
      }
    } catch (err) {
      next(err);
    }
});