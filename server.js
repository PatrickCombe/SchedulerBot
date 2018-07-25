const { RTMClient, WebClient } = require('@slack/client');
const {google}= require('googleapis');
import express from 'express';
import bodyParser from 'body-parser';
var app = express();
var urlencodedParser = bodyParser.urlencoded({ extended: false })
// Get an API token by creating an app at <https://api.slack.com/apps?new_app=1>
// It's always a good idea to keep sensitive data like the token outside your source code. Prefer environment variables.
const token = process.env.SLACK_TOKEN || '';
//if (!token) { console.log('You must specify a token to use this example'); process.exitCode = 1; return; }


//
// Google OAuth
//

// https://developers.google.com/calendar/quickstart/nodejs
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URL
)

// ask user for access to their calendar
console.log('open URI:',oauth2Client.generateAuthUrl({
  access_type: 'offline',
  state: 'DEMIMAGIC_ID', // meta-data for DB
  scope: [
    'https://www.googleapis.com/auth/calendar'
  ]
}))

//
// Google API create cal event
//
function makeCalendarAPICall(token) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
  )

  oauth2Client.setCredentials(token)

  oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      // store the refresh_token in my database!
      console.log(tokens.refresh_token);
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

makeCalendarAPICall({
  access_token: '???',
  token_type: 'Bearer',
  refresh_token: '???',
  expiry_date: 1530585071407
})

// Initialize an RTM API client
const rtm = new RTMClient(token);
const web = new WebClient(token);
// Start the connection to the platform
rtm.start();

// Log all incoming messages
rtm.on('message', (event) => {
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

// Log all reactions
rtm.on('reaction_added', (event) => {
  // Structure of `event`: <https://api.slack.com/events/reaction_added>
  console.log(`Reaction from ${event.user}: ${event.reaction}`);
});
rtm.on('reaction_removed', (event) => {
  // Structure of `event`: <https://api.slack.com/events/reaction_removed>
  console.log(`Reaction removed by ${event.user}: ${event.reaction}`);
});

// Send a message once the connection is ready
rtm.on('ready', (event) => {
  //console.log("event", event)
  // Getting a conversation ID is left as an exercise for the reader. It's usually available as the `channel` property
  // on incoming messages, or in responses to Web API requests.
  //
  //console.log("event", event)
  const conversationId = 'DBWEK8RQF';
  rtm.sendMessage(`Hey. I'm Scheduler Bot, our team's scheduling assistant. It's nice to be here to help you beautiful people out.
  I can create reminders: remind me to do laundry tomorrow. To do a really good job, I need your permission to access your calendar,
  I won't be sharing information with others. I just need to check when you're busy or free to meet. Please
  sign up with this link to connect your calendars: --insert link here--`, conversationId);
});

app.post('/slack', (req, res) => {
  console.log(req.body);
  console.log(JSON.parse(req.body.payload).actions);
  res.send('OKAY');
})

app.listen(1337);
