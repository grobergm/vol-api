const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const moment = require('moment')
const saltRounds = 10;

const middleware = require('./middleware');
const User = require('./models/User');
const Project = require('./models/Project');

app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true }, function(err) {
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
    .populate({
      path:'projects',
      populate:{
        path:'host',
        select: 'name email'
      }
    })
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
              process.env.SECRET,
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
    const newUser= new User ({
      name,
      email,
      hash,
      timeLine:[{description:"Created Profile",date:parseInt(moment().format('x'))}]
    })
    newUser.save(err=>{
       if (err){
        res.json({
          success: false,
          message: err
        })
      } else {
        let token = jwt.sign({id:newUser._id},
          process.env.SECRET,
          { expiresIn: '24h' }
        );
        res.json({
          success: true,
          message: 'Authentication successful!',
          profile: newUser,
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
      user.timeLine.unshift({description:`Started Following: ${req.body.friendName}`,date: parseInt(moment().format('x'))})
      user.save(err=>{
        if(err){
          res.json({
            success: false,
            message: err,
          })
        } else{
          res.json({
          success: true,
          message: 'started following',
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
        message: "account Deleted :(",
      })
    }
  })
})


// Load Projects for Host ID 

app.get('/api/projects/:id',(req,res)=>{
  Project.find({host:req.params.id})
  .populate({
    path:'host',
    select: 'name email'
  })
  .exec((err,projects)=>{
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
       User.findOne({_id:req.params.id},(err,user)=>{
        if(err){
          res.json({
            success: false,
            message: err,
          })
        } else {
          user.projects.push(newProject._id)
          user.timeLine.unshift({description:`Created Project: ${newProject.name}`,date:parseInt(moment().format('x'))})
          user.save(err=>{
            if(err){
              res.json({
                success: false,
                message: err,
              })
            } else{
            Project.populate(newProject,
              {path:'host', select:'name email'},
              (project)=>{
                res.json({
                  success: true,
                  message: 'added new project',
                  project: newProject
                })
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
      project.volunteers.push(req.body.userName)
      project.save(err=>{
        if(err){
          res.json({
            success: false,
            message: err,
          })
        } else{
           User.findOne({_id:req.params.id},(err,user)=>{
            if(err){
              res.json({
                success: false,
                message: err,
              })
            } else {
              user.projects.push(project._id)
              user.timeLine.unshift({description:`Signed up for: ${project.name}`,date:parseInt(moment().format('x'))})
              user.save(err=>{
                if(err){
                  res.json({
                    success: false,
                    message: err,
                  })
                } else{
                  Project.populate(project,
                    {path:'host', select:'name email'},
                    (newProject)=>{
                      res.json({
                        success: true,
                        message: 'added new project',
                        project: project
                      })
                  })
                }
              })
            }
          })
        }
      })
    }
  })
})

// assign volunteer to task

// app.put('/api/projects/assign/:id',middleware.checkToken,(req,res)=>{
//   Project.findOne({_id:req.body.projectId},(err,project)=>{
//     if(err){
//       res.json({
//         success: false,
//         message: err,
//       })
//     } else {
//       project.tasks[req.body.taskId].volunteers.unshift(req.body.volunteerId)
//       project.save(err=>{
//         if(err){
//           res.json({
//             success: false,
//             message: err,
//           })
//         } else{
//           res.json({
//           success: true,
//           message: 'Assigned volunteer to project',
//         })
//         }
//       })
//     }
//   })
// })

// // mark task as complete

// app.put('/api/projects/signup/:id',middleware.checkToken,(req,res)=>{
//   Project.findOne({_id:req.body.projectId},(err,project)=>{
//     if(err){
//       res.json({
//         success: false,
//         message: err,
//       })
//     } else {
//       project.tasks[req.body.taskId].complete=true;
//       project.save(err=>{
//         if(err){
//           res.json({
//             success: false,
//             message: err,
//           })
//         } else{
//           res.json({
//           success: true,
//           message: 'Task is complete',
//         })
//         }
//       })
//     }
//   })
// })



// Delete a project
// app.delete('/api/users/:id',middleware.checkToken,(req,res)=>{
//   Project.findOneAndDelete({host:req.params.id},(err)=>{
//     if(err){
//       res.json({
//         success: false,
//         message: err,
//       })
//     } else {
//       res.json({
//         success: true,
//         message: "Project Deleted",
//       })
//     }
//   })
// })


app.listen(process.env.PORT || 8000, () => console.log(`Server is listening`));
