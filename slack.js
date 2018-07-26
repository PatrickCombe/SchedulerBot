const {RTMClient, WebClient} = require('@slack/client');
import {interpret} from './dialogFlow';
import {getAuthUrl, refreshToken, getClient} from './calendar'
import {google} from 'googleapis'
var models = require('./models');
const token = process.env.SLACK_TOKEN

const web = new WebClient(token)
const rtm = new RTMClient(token)

rtm.start()

rtm.on('ready', function(event) {
  console.log('app ready!')
  web.chat.postMessage({
    channel: 'DBVGVLJHK',
    as_user: true,
    'text': 'Welcome to the Scheduler Bot! Please reply with verify to begin! :)'
  })
})

rtm.on('message', async (event) => {
if (event.bot_id || !event.user) return;


  if(event.text === 'verify') {
    const client = getClient();
    const user = event.user;
    const url = getAuthUrl(event.user);

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

        client.setCredentials({access_token: user.google.accessToken, refresh_token:user.google.refreshToken})

        client.on('tokens', (tokens) => {
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

          }
        });
        web.chat.postMessage({
          channel: event.channel,
          as_user: true,
          'text': 'You are already verified! Thanks! :)'
        })
      }

    })
  }
  else if (event.text !== 'verify') {
    let botResponse = await interpret(event.user, event.text);
    console.log("bot response: ", botResponse);
    if (!botResponse.allRequiredParamsPresent) {
      console.log('date: ', botResponse.parameters.fields.date)
        console.log('Subject: ', botResponse.parameters.fields.Subject)
      rtm.sendMessage(botResponse.fulfillmentText, event.channel)
      .catch(console.error)
    } else {
      const {date, Subject} = botResponse.parameters.fields;
      console.log('date: ',date);
      console.log('Subject: ' , Subject)
      console.log("AS;LKDFJAS;LKDJ", botResponse.parameters.fields)
      let text = `Confirm your task to ${Subject.stringValue} ${date.stringValue}`;
      const data =  {day: new Date(date.stringValue), subject: Subject.stringValue, summary: text}
      web.chat.postMessage({
        channel: event.channel,
        text: 'Meeting Details',
        attachments: [
          {
            "text": text,
            "callback_id": "confirm task",
            "actions": [
              {
                "name": "Confirm",
                "text": "Confirm",
                "type": "button",
                "value": JSON.stringify(data)
              },
              {
                "name": "Cancel",
                "text": "Cancel",
                "type": "button",
                "value": "false"
              }
            ]
          }
        ]
      })
      .then((res) => {
        console.log('Message sent: ', res.ts)
      })
      .catch(console.error)
    }
  }
})
