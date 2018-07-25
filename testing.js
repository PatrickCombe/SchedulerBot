import {RTMClient, WebClient} from '@slack/client'
import axios from 'axios';
// import {google} from 'googleapis'
import express from 'express'
import bodyParser from 'body-parser'
var mongoose = require('mongoose');
var connect = process.env.MONGODB_URI;
import {getAuthUrl, getToken, createEvent} from './calendar'
var models = require('./models');
const app = express();
import "./slack"
//import './calendar'
//import './dialogflow'
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.post('/slack', function(req,res) {
  let payload = JSON.parse(req.body.payload)
  let user = payload.user.id;
  let data = JSON.parse(payload.actions[0].value)
  User.findOne({slackId: user})
  .then((u) => {
    createEvent(u.googleTokens, data)
  })

  res.send('OKAY')

})

app.get("/google/callback", (req, res) => {
  var newUser = new models.User({
    google: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token
    },
    slackId: req.query.state
  })
  newUser.save()
    .then(() => {
      res.send('Congrats! You have successfully connected your Google Calendar :)')
    })
  console.log(req.query);

})


app.listen(1337)
