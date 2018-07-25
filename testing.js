import {RTMClient, WebClient} from '@slack/client'
import {google} from 'googleapis'
import express from 'express'
import bodyParser from 'body-parser'
var mongoose = require('mongoose');
var connect = process.env.MONGODB_URI;
var models = require('./models');


mongoose.connect(connect);
mongoose.connection.on('connected', function(){
  console.log('connected to mongodb!')
})
//
// Google OAuth
//

// https://developers.google.com/calendar/quickstart/nodejs
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URL
)

//
/////////////////////////// Google API create cal event///////////////////////////
//
function makeCalendarAPICall(token) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
  )

  oauth2Client.setCredentials(token) //taking on identity of another user, if bob gave me access to his google account, you are becoming bob

  oauth2Client.on('tokens', (tokens) => { //if the token is expired, can have new access token
    if (tokens.refresh_token) {
      // store the refresh_token in my database!
      console.log(tokens.refresh_token); //this means there was a new token or expired token need to save back into the database
    }
    console.log(tokens.access_token);
  });

  const calendar = google.calendar({version: 'v3', auth: oauth2Client});
/*
  calendar.events.insert({
    calendarId: 'primary', // Go to setting on your calendar to get Id
    'resource': {
      'summary': 'Google I/O 2015',
      'location': '800 Howard St., San Francisco, CA 94103',
      'description': 'A chance to hear more about Google\'s developer products.',
      'start': {
        'dateTime': '2018-07-04T02:00:35.462Z',
        'timeZone': 'America/Los_Angeles'
      },
      'end': {
        'dateTime': '2018-07-04T02:10:35.462Z',
        'timeZone': 'America/Los_Angeles'
      },
      'attendees': [
        {'email': 'lpage@example.com'},
        {'email': 'sbrin@example.com'}
      ]
    }
  }, (err, {data}) => {
    if (err) return console.log('The API returned an error: ' + err);
    console.log(data)
  })
  return;
*/

  calendar.events.list({
    calendarId: 'primary', // Go to setting on your calendar to get Id
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, {data}) => {
    if (err) return console.log('The API returned an error: ' + err);
    const events = data.items;
    if (events.length) {
      console.log('Upcoming 10 events:');
      events.map((event, i) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
      });
    } else {
      console.log('No upcoming events found.');
    }
  });
}

// makeCalendarAPICall({
//   access_token: '???',
//   token_type: 'Bearer',
//   refresh_token: '???', // PAUL IS THE GOATTTTTTTTT
//   expiry_date: 1530585071407
// })

//
/////////////////////// SLACK RTM chat bot///////////////////////////////////////
//

const token = process.env.SLACK_TOKEN

const web = new WebClient(token)
const rtm = new RTMClient(token)

rtm.start()

rtm.on('ready', function(event) {
  web.chat.postMessage({
    channel: 'DBVGVLJHK',
    as_user: true,
    'text': 'Welcome to the Scheduler Bot! Please reply with verify to begin! :)'
  })
})

rtm.on('message', function (event) {

  //console.log(event)
  if(event.text === 'verify') {
    const user = event.user;
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      state: user, // meta-data for DB
      scope: [
        'https://www.googleapis.com/auth/calendar'
      ]
    })

    models.User.findOne({slackId: event.user})
    .then((user) => {
      if(user===null){
        console.log('no user')
        web.chat.postMessage({
          channel: event.channel,
          as_user:true,
          'text': 'Thanks! Please sign up with this link to link your Google Calendar: ' + url
        })

      } else {

        oauth2Client.setCredentials({access_token: user.google.accessToken, refresh_token:user.google.refreshToken})

        oauth2Client.on('tokens', (tokens) => {

          if (tokens.refresh_token) {
            // save the two tokens to db
            User.update({slackId: userId}, {
              google: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token
              }
            }, function(err) {
                console.log('error updating user', err)
              })

          //  console.log(tokens.refresh_token);
          }
        //  console.log(tokens.access_token);
        });
        web.chat.postMessage({
          channel: event.channel,
          as_user: true,
          'text': 'You are already verified! Thanks! :)'
        })
      }
///////////////////////////////////////////////////  danko
      console.log(event)
      const conversationId = event.channel;
      if (event.bot_id){
        return;
      }
      const projectId = process.env.DIALOGFLOW_PROJECT_ID; //https://dialogflow.com/docs/agents#settings
      // create a new session for a new user that converses with the bot
      const sessionId = event.user;
      const query = event.text;
      const languageCode = 'en-US';

      // Instantiate a DialogFlow client.
      const dialogflow = require('dialogflow');
      const sessionClient = new dialogflow.SessionsClient();

      // Define session path
      const sessionPath = sessionClient.sessionPath(projectId, sessionId);
      const request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: event.text,
            languageCode: languageCode,
          },
        },
      };

      // Send request and log result
      sessionClient
        .detectIntent(request)
        .then(responses => {
          console.log('Detected intent'); // Detected intent
          const result = responses[0].queryResult;
          console.log("result", result)
          console.log(`  Query: ${result.queryText}`); // Query: hello
          console.log(`  Response: ${result.fulfillmentText}`);  // Response: Hello! How can I help you?
          if (result.queryText.search("remind")!== -1) {
            var length = result.queryText.length;
            var index = result.queryText.search('remind');
            var newString = result.queryText.slice(index + 9, length)
            //var newA = event.text.splice(index)
            web.chat.postMessage({
              channel: conversationId,
              as_user: true,
              text: 'Task',
              attachments: [
                {
                  "text": "Create a task" + newString,
                  "fallback": "Shame... buttons aren't supported in this land",
                  "callback_id": "button_tutorial",
                  "color": "#3AA3E3",
                  "attachment_type": "default",
                  "actions": [
                    {
                      "name": "Yes",
                      "text": "Yes",
                      "type": "button",
                      "value": "yes"
                    },
                    {
                      "name": "No",
                      "text": "No",
                      "type": "button",
                      "value": "no"
                    },
                    {
                      "name": "Maybe",
                      "text": "Maybe",
                      "type": "button",
                      "value": "maybe",
                      "style": "danger"
                    }
                  ]
                }
              ]
            })
            .then((res) => {
              console.log("Sent", res)
            })
            .catch((err) => {
              console.log("error", err)
            })
          }
          rtm.sendMessage(result.fulfillmentText, conversationId)
          if (result.intent) {
            console.log(`  Intent: ${result.intent.displayName}`); // Intent: Default Welcome intent
          } else {
            console.log(`  No intent matched.`);
          }
        })
        .catch(err => {
          console.error('ERROR:', err);
        });
    })
/////////////////////////////////////////////// danko
//IF TOKENS ARE EXPIRED DO THIS

  }
})

  //if(event.previous_message) console.log('@@@@', JSON.stringify(event.previous_message, null,2))
  // The RTM client can send simple string messages
  //rtm.sendMessage('Hello there', event.channel, function(err, res) {
  //  console.log(err, res);
  //})
  // if (event.bot_id) return
  // web.chat.postMessage({
  //   channel: event.channel,
  //   as_user: true,
  //   'text': 'Would you like to play a game?',
  //   //response_url: "", webhook
  //   'attachments': [
  //     {
  //       'text': 'Choose a game to play',
  //       'fallback': 'You are unable to choose a game',
  //       'callback_id': 'wopr_game',
  //       'color': '#3AA3E3',
  //       'attachment_type': 'default',
  //       'actions': [
  //         {
  //           'name': 'game',
  //           'text': 'Chess',
  //           'type': 'button',
  //           'value': 'chess'
  //         },
  //         {
  //           'name': 'game',
  //           'text': 'Falken\'s Maze',
  //           'type': 'button',
  //           'value': 'maze'
  //         },
  //         {
  //           'name': 'game',
  //           'text': 'Thermonuclear War',
  //           'style': 'danger',
  //           'type': 'button',
  //           'value': 'war',
  //           'confirm': {
  //             'title': 'Are you sure?',
  //             'text': 'Wouldn\'t you prefer a good game of chess?',
  //             'ok_text': 'Yes',
  //             'dismiss_text': 'No'
  //           }
  //         }
  //       ]
  //     }
  //   ]
  // })
//     .then((res) => {
//       // `res` contains information about the posted message
//       console.log('Message sent: ', res.ts)
//     })
//     .catch(console.error)
//})

//
// OAuth & webhook callbacks
//
const app = express()

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Google OAuth2 callback
app.get(process.env.REDIRECT_URL.replace(/https?:\/\/.+\//, '/'), (req, res) => {
  oauth2Client.getToken(req.query.code, function (err, token) {
    if (err) return console.error(err.message)
    //console.log('token', token, 'req.query:', req.query) // req.query.state <- meta-data

      var newUser = new models.User({
        google: {
          accessToken: token.access_token,
          refreshToken: token.refresh_token
        },
        slackId: req.query.state
      })

      console.log(newUser)

      newUser.save(function(error,result){
        if(error){
          console.log(error, 'error saving user')
        }else {
          console.log('yay!')
        }
      })

    res.send('Congrats! You have successfully connected your Google Calendar :)')
  })
})

// slack Webhook
app.post('/slack', (req, res) => {
  console.log('>>>', JSON.parse(req.body.payload))
  res.end()
})

app.listen(1337)
//////////////////////////////////DIALOG FLOW /////////////////////////////////////
