const { Router } = require('express')

const router = Router()
const usersRouter = require('./users').router
const marketplaceRouter = require('./marketplace').router
const alertRouter = require('./alert').router


router.use('/users', usersRouter)
router.use('/marketplace', marketplaceRouter)
router.use('/alert', alertRouter)

module.exports = router