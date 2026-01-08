const express = require('express');
const router = express.Router();

const {
    insertReview,
    getReviews,
    deleteReview
} = require('../services/reviewService');

router.post('/insertReview',insertReview);
router.post('/getReviews',getReviews);
router.delete('/deleteReview/:reviewId',deleteReview)

module.exports = router;