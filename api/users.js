const router = require('express').Router()

const { getDb } = require('../mongodb')
exports.router = router
const { ObjectId } = require('mongodb');
const e = require('express');

const userSchema = {
    name: { required: true },
    email: { required: true },
    password: { required: true },
    University: { required: true }
  }
  