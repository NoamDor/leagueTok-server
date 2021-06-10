const express = require('express');
const router = express.Router();

const {
    connect, getAll, get, registerDeviceToken, setIsAdmin
} = require('../controllers/user');

router.post('/sign-up', connect);
router.get('/all/:lastUpdated', getAll);
router.get("/:uid", get);
router.put('/device', registerDeviceToken);
router.put('/admin', setIsAdmin);

module.exports = router;