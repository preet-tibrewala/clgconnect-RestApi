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
const { log } = require('console');

const rentalsSchema = {
    "ownerId": { required: true },
    "title": { required: true },
    "price": { required: true },
    "Bedroom_available": { required: true },
    "Total_Bedroom": { required: true },
    "Total_Bathroom": { required: true },
    "City": { required: true },
    "Pets": { required: true },
    "Parking": { required: true },
    "Gender_preference": { required: true },
    "Property_type": { required: true },
    "Description": { required: true }
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
    const rentalsCollection = db.collection('rentals');
    const bucket = new GridFSBucket(db, {
      bucketName: 'photos'
    });

    const isValid = validateAgainstSchema(req.body, rentalsSchema);
    console.log(isValid);

    if (validateAgainstSchema(req.body, rentalsSchema)) {
      try {
        const rentalItem = extractValidFields(req.body, rentalsSchema);
        rentalItem.ownerId = new ObjectId(req.body.ownerId);
        rentalItem.TimeStamp = new Date();
        rentalItem.photos = [];

        if(req.files && req.files.length > 0) {
            for (const file of req.files) {
                const fileId = await uploadToGridFS(file.buffer, file.originalname, file.mimetype, bucket);
                rentalItem.photos.push({
                    imageId: fileId,
                    filename: file.originalname,
                    contentType: file.mimetype,
                    url: `${req.protocol}://${req.get('host')}/rentals/${fileId}/download`
                });
            }
        }

        const result = await rentalsCollection.insertOne(rentalItem);
        res.status(201).send({ id: result.insertedId });
      } catch (err) {
        next(err);
      }
    } else {
      res.status(400).send({
        error: "Request body is not a valid rental object."
      });
    }
})

router.get('/:itemId', async function(req, res, next) {
    const db = getDb();
    const rentalsCollection = db.collection('rentals');
    const itemId = new ObjectId(req.params.itemId);

    try {
        const item = await rentalsCollection.findOne({ _id: itemId });
        if (item) {
          res.status(200).send(item);
        } else {
          next();
        }
      } catch (err) {
        next(err);
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
})

updateReqSchema = {
    "title": { required: false },
    "price": { required: false },
    "Bedroom_available": { required: false },
    "Total_Bedroom": { required: false },
    "Total_Bathroom": { required: false },
    "City": { required: false },
    "Pets": { required: false },
    "Parking": { required: false },
    "Gender_preference": { required: false },
    "Property_type": { required: false },
    "Description": { required: false }

}

router.patch('/:itemId', upload.array('image', 10), async function(req, res, next) {
    console.log(req.body);

    const isValid = validateAgainstSchema(req.body, updateReqSchema);
    console.log(isValid);
    if (isValid) {
        try {
            const db = getDb();
            const rentalsCollection = db.collection('rentals');
            const itemId = new ObjectId(req.params.itemId);
            const rentalsItem = extractValidFields(req.body, updateReqSchema);
            rentalsItem.TimeStamp = new Date();
            const result = await rentalsCollection.updateOne({ _id: itemId }, { $set: rentalsItem });
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
})

router.delete('/:itemId', async function(req, res, next) {
    const db = getDb();
    const rentalsCollection = db.collection('rentals');
    const itemId = new ObjectId(req.params.itemId);
  
    try {
      const result = await rentalsCollection.deleteOne({ _id: itemId });
      if (result.deletedCount > 0) {
        res.status(204).send();
      } else {
        next();
      }
    } catch (err) {
      next(err);
    }
})

router.get('/', async function(req, res, next) {
    const db = getDb();
    const rentalsCollection = db.collection('rentals');
    try {
        const items = await rentalsCollection.find({}).toArray();
        res.status(200).send(items);
    } catch (err) {
        next(err);
    }
})