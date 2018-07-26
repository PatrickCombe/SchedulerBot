import {google} from 'googleapis'
const SCOPES =  ['https://www.googleapis.com/auth/calendar']

// Google OAuth

// https://developers.google.com/calendar/quickstart/nodejs
export function getClient() {
  return new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL,
    process.env.NGROK + "/google/callback"
)}

export function getAuthUrl(state) {
  return getClient().generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state
  });
}

export function getToken(code, cb) {
  getClient().getToken(code, cb)
}

export function refreshToken(token) {
  let client = getClient();
  client.setCredentials(token);
  return new Promise((resolve, reject) => {
    client.refreshAccessToken((err, token) => {
    if(err) reject(err)
    resolve(token)
  })
})
}

export function createEvent(token, data) {
  let client = getClient();
  client.setCredentials(token);
  const calendar = google.calendar({version: 'v3', auth: client});
  console.log(data)
  let start = new Date(data.day)
  console.log(start)
  // start.setHours(time.getHours());
  // start.setMinutes(time.getMinutes());
  calendar.events.insert({
    calendarId: 'primary',
    resource: {
      summary: data.summary,
      start: {
        dateTime: start.toISOString()
      },
      end: {
        dateTime: new Date(start+ 60000)
      }
    }
  })
}
