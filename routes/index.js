const router = module.exports = require('express').Router();

router.use('/adopters', require('./adopters'));
router.use('/animals', require('./animals'));
router.use('/login', require('./login'));
router.use('/sign-up', require('./sign-up'));
router.use('/users', require('./users'));
