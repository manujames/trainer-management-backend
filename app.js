const express = require('express');
const app = express();

const cors = require('cors');
app.use(cors());

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({extended:false,limit:"2mb"}));
// Parse JSON bodies (as sent by API clients)
app.use(express.json({limit:"2mb"}));

const PORT = process.env.PORT || 3000;
const ADMIN = "admin@ictak.com";
const ADMIN_PWD = "Admin@123";
const TRAINER = "trainer@ictak.com";
const TRAINER_PWD = "Trainer@123";

const trainerRouter = require('./src/routes/trainerRoutes')();

app.use('/trainer',trainerRouter);

app.get('/', (req,res)=>{
    res.send("Trainer Management API");
});

app.post('/login', (req,res)=>{
    // Fetch user inputs from form
    let credentials = req.body;
    console.log(credentials);
    // Check login credentials
    // UserData.findOne({email:credentials.email})
    // .then((user)=>{
    //     if(user && user.password === credentials.password){       // Found email id and passwords matching
    //         let token = createToken(user.email,user.password);
    //         res.status(200).send({token});
    //     }
    //     else{
    //         res.status(401).send('Invalid Username or Password');
    //     }
    // })
    // .catch((err)=>{
    //     console.log(err);
    //     //Handle error here
    //     res.status(500).send()
    // });
    if(credentials.role == 'admin' && credentials.email == ADMIN && credentials.password == ADMIN_PWD){
        let response = {};
        response.role = credentials.role;
        res.status(200).send(response);
    }
    else if(credentials.role == 'trainer' && credentials.email == TRAINER && credentials.password == TRAINER_PWD){
        let response = {};
        response.role = credentials.role;
        res.status(200).send(response);
    }
    else{
        res.status(401).send('Invalid Username or Password');
    }
});
 
app.listen(PORT,()=>{
    console.log(`Server started on port ${PORT}.`);
});