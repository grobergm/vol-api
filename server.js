const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const saltRounds = 10;

const env = require('./.env.js');
const middleware = require('./middleware');
const User = require('./models/User');
const Project = require('./models/Project');

const port = 8000;

app.use(cors());
app.use(bodyParser.json());

const mongo_uri = `mongodb+srv://grobergm:${env.dbPass}@volnetdb-oplmq.mongodb.net/vol-net-data?retryWrites=true&w=majority`;
mongoose.connect(mongo_uri, { useNewUrlParser: true }, function(err) {
  if (err) {
    throw err;
  } else {
    console.log(`Successfully connected to ${mongo_uri}`);
  }
});

// Checks username and password, 
app.post('/api/authenticate', (req,res)=>{
  const {email,password} = req.body;
  if (email && password){
    User.findOne({email},(err,user)=>{
      if (err){
        res.json({
          success: false,
          message: err
        })
      } else if (!user) {
         res.json({
          success: false,
          message: 'Email and Password do not match existing users'
        })
      } else {
        bcrypt.compare(password, user.hash, function(err, validPassword) {
          if (validPassword){
            let token = jwt.sign({id:user._id},
              env.secret,
              { expiresIn: '24h' }
            );
            res.json({
              success: true,
              message: 'Authentication successful!',
              profile:user,
              token: token
            });
          }
        });
      }
    })
  }

});

app.post('/api/register', (req,res)=>{
  const {name,email,password} = req.body;
  // needs to check if user exists already
  bcrypt.hash(password,saltRounds,function(err,hash){
    const newUser= new User ({name,email,hash})
    newUser.save(err=>{
       if (err){
        res.json({
          success: false,
          message: err
        })
      } else {
        let token = jwt.sign({id:newUser._id},
          env.secret,
          { expiresIn: '24h' }
        );
        res.json({
          success: true,
          message: 'Authentication successful!',
          profile:newUser,
          token: token
        });
      }
    })
  })
});

app.get('/api/projects/:id',(req,res)=>{
  Project.find({host:req.params.id},(err,projects)=>{
    if(err){
      console.log(err)
    } else {
      res.json({
        success: true,
        message: 'got the projects',
        projects:projects,
      })
    }
  })
})


app.post('/api/projects/:id',middleware.checkToken,(req,res)=>{

  const {name,goals} = req.body;

  const newProject= new Project({name,host:req.params.id,goals})

  newProject.save(err=>{
    if(err){
      console.log(err)
    } else {
      console.log(newProject)
    }
  })
})

// app.put('/api/:id',(req,res)=>{
//   User.findOneAndUpdate(req.params.id,(err,user)=>{
//     if(err){
//       console.log(err)
//     } else {

//       // update user profile
//     }
//   })
// })


app.listen(port, () => console.log(`Server is listening on port: ${port}`));
