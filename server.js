const express = require('express')
const morgan = require('morgan')

const api = require('./api')
const https = require('https');
const fs = require('fs');
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

const { connectToDb } = require('./mongodb')

const app = express()
const port = process.env.PORT || 8000

/*
 * Morgan is a popular request logger.
 */
app.use(morgan('dev'))

app.use(express.json())
app.use(express.static('public'))

/*
 * All routes for the API are written in modules in the api/ directory.  The
 * top-level router lives in api/index.js.  That's what we include here, and
 * it provides all of the routes.
 */
app.use('/', api)

app.use('*', function (req, res, next) {
  res.status(404).send({
    error: `Requested resource "${req.originalUrl}" does not exist`
  })
})

/*
 * This route will catch any errors thrown from our API endpoints and return
 * a response with a 500 status to the client.
 */
app.use('*', function (err, req, res, next) {
  console.error("== Error:", err)
  res.status(500).send({
      error: "Server error.  Please try again later."
  })
})

connectToDb().then(function () {

    https.createServer(options, app).listen(port, function () { // Create an HTTPS server
        console.log("== Server is running on port", port);
    });
})