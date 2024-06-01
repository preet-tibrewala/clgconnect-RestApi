const router = require('express').Router()
const { validateAgainstSchema, extractValidFields } = require('../lib/validation')
const { getDb } = require('../mongodb')
exports.router = router
const { ObjectId } = require('mongodb');
const e = require('express');
const bcrypt = require('bcrypt')

const marketplaceSchema = {
    
}