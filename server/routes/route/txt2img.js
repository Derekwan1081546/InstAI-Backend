const express = require('express')
const axios = require('axios')
const fs = require('fs');
const { error } = require('console');
const router = express.Router()
const INSTANCE_IP = process.env.INSTANCE_IP;
const ensuretoken = require('../../authtoken.js');
const jwt = require('jsonwebtoken');
const secretkey = process.env.SECRETKEY;
//* middleware
router.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', `http://localhost:3000`);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    console.log(req.method, req.url)
    next()
})

//* send to img2img api (stable diffusion)
//TODO edit request to requestData
router.post('/process', ensuretoken, async function (req, res) {
    console.log(req.token);
    jwt.verify(req.token, secretkey , async function(err,data){
        if(err){
        res.sendStatus(403);
        } else {
            try {
                //! transfer data
                // const raw_image = req.body.raw_image
                // const prompt = req.body.prompt
                // const negative_prompt = req.body.negative_prompt
                // const resize_mode = req.body.resize_mode
                // const denoising_strength = req.body.denoising_strength
                // const inpaint_full_res = req.body.inpaint_full_res
                // const inpaint_full_res_padding = req.body.inpaint_full_res_padding
        
                //! read image from directory & send json(request) to stable diffusion
                // if (err) {
                //     console.log(err)
                //     return res.status(500).send('error')
                // }
                // const requestData =
                // {
                //     // main argument
                //     "prompt": "a dog",
                //     "negative_prompt": "",
                //     "denoising_strength": 0.6,
                //     "styles": [],
                //     "seed": -1,
                //     "batch_size": 1,
                //     "n_iter": 1,
                //     "steps": 50,
                //     "cfg_scale": 7,
                //     "width": 512,
                //     "height": 512,
                //     "restore_faces": false,
                //     "tiling": false,
                //     "eta": 0,
                //     "sampler_index": "Euler",
                //     "alwayson_scripts": "",
        
                //     // setup argument
                //     "override_settings": {
                //         "sd_model_checkpoint": "v1-5-pruned-emaonly.ckpt"
                //     },
                //     "send_images": true,
                //     "save_images": false,
                // }
                //? send json(request) to stable diffusion
                console.log(req.body);
                axios.post('http://127.0.0.1:7860/sdapi/v1/txt2img', req.body, { timeout: 1000000 * 10 ^ 3 })
                    .then(reponse => {
                        const data_image = reponse.data.images
                        res.status(200).json(data_image)
                    })
                    .catch(error => {
                        console.log(error)
                        res.status(500).send("error")
                    })
            } catch (err) {
                console.log(err)
                res.status(500).send("error")
            }
        }
    })
    

})


// router.get('/process', async (req, res) => {
//     try{
//         res.status(200).json(data_image);
//     }catch(err){
//         console.log(err);
//         res.status(500).send("error");
//     }
// })

module.exports = { router }