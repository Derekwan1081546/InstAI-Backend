const express = require('express')
const axios = require('axios')
const fs = require('fs')
const router = express.Router()
const INSTANCE_IP = process.env.INSTANCE_IP;
router.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', `http://localhost:8080`);
    // res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    // res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    console.log(req.method, req.url)
    next()
})

router.get('/test', (req, res) => {
    console.log('test work')
    res.status(200).json('return')
})

module.exports = { router }