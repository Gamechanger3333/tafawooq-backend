const express = require('express');
const paymentController = require('../controllers/paymentsController');

const router = express.Router();

router.post('/', paymentController.createPayment);
router.get('/', paymentController.getAllPayments);
router.get('/:id', paymentController.getPaymentById);
router.put('/:id', paymentController.updatePayment);

module.exports = router;
