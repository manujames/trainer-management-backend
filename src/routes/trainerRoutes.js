const express = require('express');
const trainerRouter = express.Router();
const TrainerData = require('../model/Database').TrainerData;
const CredentialData = require('../model/Database').CredentialData;
const EMAIL_ID = 'projectdev.fsd@gmail.com'

router = (verifyToken,mailTrasporter)=>{
    trainerRouter.get('/profile/',verifyToken,(req,res)=>{           //Get trainer profile
        let trainerId = req.user.ictId;
        if(req.user.role == 'admin'){
            return res.status(403).send('Forbidden');
        }
        else{
            TrainerData.findOne({"ictId":trainerId},{"_id":0, "__v":0, "approved":0})     //Find by ictId. Exclude _id, __v, approved fields
            .then((trainer)=>{
                if(trainer){
                    res.status(200).send(trainer);
                }
                else{
                    res.status(404).send("Trainer not found.");
                }
            })
            .catch((err)=>{
                console.log(err);
                // Handle errors
                res.status(500).send("Database read failed.");
            });
        }
    });

    trainerRouter.put('/profile/',(req,res)=>{           //Edit trainer profile
        let trainerId = req.params.id;
        let updatedProfile = req.body;
        TrainerData.findOneAndUpdate({"ictId":trainerId},updatedProfile)
        .then((trainer)=>{
            if(trainer) res.status(200).send();
            else res.status(404).send("Trainer with specified id not found.");
        })
        .catch((err)=>{
            console.log(err);
            // Handle errors
            res.status(500).send("Database write failed.");
        });
    });


    trainerRouter.post('/enroll',(req,res)=>{               //Enroll new trainer
        // Fetch user inputs from form
        let newTrainer = {
            fname: req.body.fname,
            sname: req.body.sname,
            email: req.body.email,
            phone: req.body.phone,
            gender: req.body.gender,
            address: req.body.address,
            qualification: req.body.qualification,
            skills: req.body.skills.split(','),
            course: req.body.course.split(','),
            currentCompany: req.body.currCompany,
            currentDesignation: req.body.currDesig,
            approved:false,         //Set to true only after admin's approval
            img:{
                data: req.body.img.data ,
                contentType: req.body.img.contentType
            }
        };
        let newTrainerCredentials = {
            email: req.body.email,
            password: req.body.password,
            role: 'trainer',
            approved: false         //Set to true only after admin's approval
        }
        CredentialData.findOne({email:newTrainerCredentials.email})
        .then((user)=>{
            if(user){       // Email id already in use
                res.status(409).send('Email id alredy registered.');
            }
            else{
                generateId()
                .then((newIctId)=>{
                    newTrainer.ictId = newIctId;
                    newTrainerCredentials.ictId = newIctId;
                    CredentialData(newTrainerCredentials).save()                        //Save credentials
                    TrainerData(newTrainer).save()                                      //Save trainer details

                    let mailOptions = {
                        from: EMAIL_ID, // sender address
                        to: newTrainer.email, // list of receivers
                        subject: "Trainer Enrollment Confirmation", // Subject line
                        text: "Thank you for your interest in joining ICTAK as a trainer. We will verify your submission and get back to you soon." // plain text body
                        // html: "<b>Hello world?</b>", // html body
                    };
                    mailTrasporter.sendMail(mailOptions);
                    res.status(200).send();
                })
                .catch((err)=>{
                    console.log(err);
                    //Handle error here
                    res.status(500).send();
                });
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

function generateId(){
    return new Promise(function(resolve,reject){
        //Get latest added trainer profile
        TrainerData.findOne({}, "ictId", {sort:{$natural:-1}})
        .then((trainer) => {
            let newId;
            if(trainer == null){        // If no profiled found, assign id as TR1
                newId = "TR1";
            }
            else{                       // Else if profile found, detect the number part of the id and increment it.
                let lastIdNum = parseInt(trainer.ictId.substring(2));
                newId = `TR${lastIdNum + 1}`;
            }
            resolve(newId);
        })
        .catch((err)=>{
            reject(err);
        });
    });
}

module.exports = router;