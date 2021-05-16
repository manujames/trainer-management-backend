const express = require('express');
const trainerRouter = express.Router();
const TrainerData = require('../model/Database').TrainerData;

router = ()=>{
    trainerRouter.post('/enroll',(req,res)=>{
        // Fetch user inputs from form
        let newTrainer = {
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            phone: req.body.phone,
            address: req.body.address,
            qualification: req.body.qualification,
            skills: req.body.skills,
            course: req.body.course,
            currentCompany: req.body.currentCompany,
            currentDesignation: req.body.currentDesignation,
            img:{
                data: '',
                contentType: ""
            }
        };
        TrainerData.findOne({email:newTrainer.email})
        .then((user)=>{
            if(user){       // Email id already in use
                res.status(409).send('Email id alredy registered.');
            }
            else{
                TrainerData(newTrainer).save()
                .then(()=>{
                    // let token = createToken(newTrainer.email, newTrainer.password);
                    // res.status(200).send({token});
                    res.status(200).send();
                })
            }
        })
        .catch((err)=>{
            console.log(err);
            //Handle error here
            res.status(500).send();
        });
    });
    return trainerRouter;
}

module.exports = router;