const {RTMClient, WebClient} = require('@slack/client')
const token = process.env.SLACK_TOKEN
const rtm = new RTMClient(token);
const web = new WebClient(token);
const projectId = process.env.DIALOGFLOW_PROJECT_ID; //https://dialogflow.com/docs/agents#settings
// create a new session for a new user that converses with the bot
const sessionId = 'quickstart-session-id';
const query = 'Schedule a meeting';
const languageCode = 'en-US';

// Instantiate a DialogFlow client.
const dialogflow = require('dialogflow');
const sessionClient = new dialogflow.SessionsClient();

// Define session path

export function interpret(slackId, query) {
  const sessionPath = sessionClient.sessionPath(projectId, slackId);
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: query,
        languageCode: languageCode,
      },
    },
  };

// Send request and log result
return sessionClient
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
        channel: slackId,
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
    rtm.sendMessage(result.fulfillmentText, slackId)
    if (result.intent) {
      console.log(`  Intent: ${result.intent.displayName}`); // Intent: Default Welcome intent
    } else {
      console.log(`  No intent matched.`);
    }
  })
  .catch(err => {
    console.error('ERROR:', err);
  });
}
