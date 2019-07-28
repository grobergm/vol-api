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

// get a users profile

app.get('/api/users/:email',(req,res)=>{
  User.findOne({email:req.params.email},(err,user)=>{
    if (err){
      res.json({
        success: false,
        message: err
      })
    } else if (!user) {
       res.json({
        success: false,
        message: 'No User Found'
      })
    } else {
      res.json({
        success: true,
        message: 'Found User',
        profile:user,
      });
    }
  });
})

// Checks username and password, 
app.post('/api/authenticate', (req,res)=>{
  const {email,password} = req.body;
  if (email && password){
    User.findOne({email})
    .populate('friends')
    .populate('projects')
    .exec((err,user)=>{
      if (err){
        res.json({
          success: false,
          message: err
        })
      } else if (!user) {
         res.json({
          success: false,
          message: 'No User Found'
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

// Follow a friend
app.put('/api/follow/:id',middleware.checkToken,(req,res)=>{
  User.findOne({_id:req.params.id},(err,user)=>{
    if(err){
      res.json({
        success: false,
        message: err,
      })
    } else {
        user.friends.push(req.body.friendId)
        user.save(err=>{
          if(err){
            res.json({
              success: false,
              message: err,
            })
          } else{
            res.json({
            success: true,
            message: 'Added Friend!',
          })
          }
        })
    }
  })
})

app.delete('/api/users/:id',middleware.checkToken,(req,res)=>{
  User.findOneAndDelete({_id:req.params.id},(err)=>{
    if(err){
      res.json({
        success: false,
        message: err,
      })
    } else {
      res.json({
        success: true,
        message: "Account Deleted :(",
      })
    }
  })
})


// Load Projects for Host ID 

app.get('/api/projects/:id',(req,res)=>{
  Project.find({host:req.params.id},(err,projects)=>{
    if(err){
      res.json({
        success: false,
        message: err,
      })
    } else {
      res.json({
        success: true,
        message: 'got the projects',
        projects: projects,
      })
    }
  })
})

// Add New Project
app.post('/api/projects/:id',middleware.checkToken,(req,res)=>{

  const {name,tasks} = req.body;
  const newProject= new Project({name,host:req.params.id,tasks})

  newProject.save(err=>{
    if(err){
      res.json({
        success: false,
        message: err,
      })
    } else {
        // pull this out into its own function
       User.findOne({_id:req.params.id},(err,user)=>{
        if(err){
          res.json({
            success: false,
            message: err,
          })
        } else {
            user.projects.push(newProject._id)
            user.save(err=>{
              if(err){
                res.json({
                  success: false,
                  message: err,
                })
              } else{
                res.json({
                success: true,
                message: 'Added Project',
              })
              }
            })
        }
      })
    }
  })
})

// Sign up for a project (check token is used to add id to project)

app.put('/api/projects/signup/:id',middleware.checkToken,(req,res)=>{
  Project.findOne({_id:req.body.projectId},(err,project)=>{
    if(err){
      res.json({
        success: false,
        message: err,
      })
    } else {
      project.volunteers.push(req.params.id)
      project.save(err=>{
        if(err){
          res.json({
            success: false,
            message: err,
          })
        } else{
          res.json({
          success: true,
          message: 'Signed up for project',
        })
        }
      })
    }
  })
})

// Delete a project
app.delete('/api/users/:id',middleware.checkToken,(req,res)=>{
  Project.findOneAndDelete({host:req.params.id},(err)=>{
    if(err){
      res.json({
        success: false,
        message: err,
      })
    } else {
      res.json({
        success: true,
        message: "Project Deleted",
      })
    }
  })
})


app.listen(port, () => console.log(`Server is listening on port: ${port}`));
