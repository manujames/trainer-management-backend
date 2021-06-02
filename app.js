const express = require('express');
const app = express();
// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({extended:false,limit:"2mb"}));
// Parse JSON bodies (as sent by API clients)
app.use(express.json({limit:"2mb"}));

const CourseData = require('./src/model/Database').CourseData;
const CredentialData = require('./src/model/Database').CredentialData;

const cors = require('cors');
app.use(cors());

const nodemailer = require("nodemailer");
const EMAIL_ID = 'projectdev.fsd@gmail.com';
const EMAIL_PWD = 'letmein@123';

// Generate test SMTP service account from ethereal.email
// Only needed if you don't have a real mail account for testing
// let mailAccount = await nodemailer.createTestAccount();

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_ID,
      pass: EMAIL_PWD
    }
});


const PORT = process.env.PORT || 3000;

const jwt = require('jsonwebtoken')
const secretKey = 'secretKey';

function createToken(user,pwd,role){
    let payload = {
        subject: {
            user:user,
            pwd:pwd,
            role:role
        }
    };
    return jwt.sign(payload, secretKey);
}

function verifyToken(req, res, next){
    if(!req.headers.authorization){
        return res.status(401).send('Unauthorized request');
    }
    
    let token = req.headers.authorization.split(' ')[1]
    if(token === 'null'){
        return res.status(401).send('Unauthorized request');   
    }
    
    try {
        let payload = jwt.verify(token, secretKey);
        if(!payload || !payload.subject || !payload.subject.user || !payload.subject.pwd || !payload.subject.role){
            return res.status(401).send('Unauthorized request');
        }

        CredentialData.findOne({email:payload.subject.user, password:payload.subject.pwd, role:payload.subject.role})
        .then((user)=>{
            if(user){
                req.user = user;    // store user information in req object
                next();
            }
            else{
                return res.status(401).send('Unauthorized request');
            }
        })
        .catch((err)=>{
            console.log(err);
            //Handle error here
            return res.status(500).send("Database read error");
        });
    } 
    catch(error){
        console.log(error);
        return res.status(401).send('Unauthorized request');
    }
}


const trainerRouter = require('./src/routes/trainerRoutes')(verifyToken,transporter);
const adminRouter = require('./src/routes/adminRoutes')(verifyToken,transporter);

app.use('/trainer',trainerRouter);
app.use('/admin',adminRouter);

app.get('/', (req,res)=>{
    res.send("Trainer Management API");
});

app.post('/login', (req,res)=>{
    // Fetch user inputs from form
    let credentials = req.body;
    // Check login credentials
    CredentialData.findOne({email:credentials.email,password:credentials.password,role:credentials.role})
    .then((user)=>{
        if(user){
            if(user.approved){
                let token = createToken(user.email,user.password,user.role);
                res.status(200).send({token:token,role:user.role});
            }
            else{
                res.status(401).send("Your enrollment is in verification stage. Please watch your email for updates regarding approval.")
            }
        }
        else{
            res.status(401).send('Invalid Username or Password');
        }
    })
    .catch((err)=>{
        console.log(err);
        //Handle error here
        res.status(500).send()
    });
});

app.put('/changepassword', verifyToken ,(req,res)=>{
    // Fetch user inputs from form
    let credential = {
        role: req.user.role,        //role stored in req object in verifyToken middleware
        email: req.user.email,      //email stored in req object in verifyToken middleware
        currentPassword: req.body.currentPassword,
        newPassword: req.body.newPassword
    }
    CredentialData.findOne({email:credential.email, password:credential.currentPassword, role:credential.role})
    .then((user)=>{
        if(user){
            CredentialData.updateOne({email:credential.email},{password:credential.newPassword})
            .then(()=>{
                // generate new token
                let token = createToken(credential.email, credential.newPassword, credential.role);
                res.status(200).send({token:token});
            })
        }
        else{
            res.status(401).send('Invalid credentials');
        }
    });
});

app.get('/courses',(req,res)=>{
    CourseData.find({},{"_id":0,"__v":0})
    .then((courses)=>{
        res.status(200).send(courses);
    })
    .catch((err)=>{
        console.log(err);
        // Handle errors
        res.status(500).send("Database read failed.");
    });
});
 
app.listen(PORT,()=>{
    console.log(`Server started on port ${PORT}.`);
});

/*
 db.courses.insert([{"courseId":"01_DSA", "courseName":"CERTIFIED SPECIALIST IN DATA SCIENCE & ANALYTICS"},{"courseId":"02_FSD", "courseName":"CERTIFIED SPECIALIST IN FULL STACK DEVELOPMENT"},{"courseId":"03_RPA", "courseName":"ROBOTIC PROCESS AUTOMATION"},{"courseId":"04_CSA", "courseName":"CERTIFIED CYBER SECURITY ANALYST"},{"courseId":"05_XLP", "courseName":"CERTIFIED XR ASSOCIATE"},{"courseId":"06_DM", "courseName":"DIGITAL MARKETING"}])
*/