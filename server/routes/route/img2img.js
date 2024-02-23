const express = require('express')
const axios = require('axios')
const fs = require('fs')
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
router.post('/process', ensuretoken, function (req, res) {
    console.log(req.token);
    jwt.verify(req.token, secretkey , async function(err,data){
        if(err){
        res.sendStatus(403);
        } else {
            try {
                //     //! transfer data
                //     const raw_image = req.body.raw_image
                //     const prompt = req.body.prompt
                //     const negative_prompt = req.body.negative_prompt
                //     const resize_mode = req.body.resize_mode
                //     const denoising_strength = req.body.denoising_strength
                //     const inpaint_full_res = req.body.inpaint_full_res
                //     const inpaint_full_res_padding = req.body.inpaint_full_res_padding
            
                //     //! read image from directory & send json(request) to stable diffusion
                //     if (err) {
                //         console.log(err)
                //         return res.status(500).send('error')
                //     }
                //     const requestData =
                //     {
                //         // main argument
                //         "init_images": [raw_image], //? string
                //         "prompt": prompt, //? string
                //         "negative_prompt": negative_prompt, //? string
                //         "resize_mode": resize_mode, //? int
                //         "denoising_strength": denoising_strength, //? int
                //         "inpaint_full_res": inpaint_full_res, //? true/false
                //         "inpaint_full_res_padding": inpaint_full_res_padding, //? int
                //         "inpainting_mask_invert": 0, //? int
                //         "initial_noise_multiplier": 0, //? int
                //         "styles": [], //? 
                //         "seed": -1, //? int
                //         "batch_size": 1, //? int
                //         "n_iter": 1, //? int
                //         "steps": 50, //? int
                //         "cfg_scale": 7, //? int
                //         "width": 1040, //? int
                //         "height": 585, //? int
                //         "restore_faces": false,
                //         "mask_blur": 10, //? int
                //         "tiling": false, //? true/false
                //         "eta": 0, //? int
                //         "sampler_index": "DPM++ 2M Karras", //? string
                //         "alwayson_scripts": "", //? 
            
                //         // setup argument
                //         "override_settings": {
                //             "sd_model_checkpoint": "v1-5-pruned-emaonly.ckpt" //? string
                //         },
                //         "send_images": true, //? true/false
                //         "save_images": false, //? true/false
                //         "include_init_images": false, //? true/false
                //     }
                    console.log(req.body);
                    //? send json(request) to stable diffusion
                    axios.post('http://127.0.0.1:7860/sdapi/v1/img2img', req.body, { timeout: 3600 * 10 ^ 3 }) //? waitting response for 60 mins
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
    

    // console.log(req.body)

    // res.send("test")

})

module.exports = { router }