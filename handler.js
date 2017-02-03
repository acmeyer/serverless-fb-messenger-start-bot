'use strict';

const axios = require('axios');

function receivedMessage(event) {
  var senderId = event.sender.id;
  var recipientId = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log('Received message for user %d and page %d at %d with message:',
  senderId, recipientId, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {

    // If we receive a text message, check to see if it matches a keyword
    // and send back the example. Otherwise, just echo the text we received.
    switch (messageText) {
      case 'generic':
        sendGenericMessage(senderId);
        break;
      default:
        sendTextMessage(senderId, messageText);
    }
  } else if (messageAttachments) {
    sendTextMessage(senderId, 'Message with attachment received');
  }
}

function receivedPostback(event) {
  var senderId = event.sender.id;
  var recipientId = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " +
    "at %d", senderId, recipientId, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful
  sendTextMessage(senderId, "Postback called");
}

function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  const accessToken = process.env.FB_PAGE_TOKEN;
  const url = `https://graph.facebook.com/v2.8/me/messages?access_token=${accessToken}`;

  axios.post(url, messageData).then((response) => {
    var recipientId = response.data.recipient_id;
    var messageId = response.data.message_id;

    console.log("Successfully sent generic message with id %s to recipient %s",
    messageId, recipientId);
  }).catch((error) => {
    console.error("Unable to send message. Error: ", error);
  });
}

module.exports.webhook = (event, context, callback) => {
  if (event.httpMethod === 'GET') {
    // facebook app verification
    if (event.queryStringParameters['hub.verify_token'] === process.env.SECRET_TOKEN && event.queryStringParameters['hub.challenge']) {
      const response = {
        statusCode: 200,
        body: parseInt(event.queryStringParameters['hub.challenge'])
      };
      return callback(null, response);
    } else {
      return callback('Invalid token', {statusCode: 403});
    }
  }

  if (event.httpMethod === 'POST') {
    var data = JSON.parse(event.body);

    if (data.object === 'page') {
      data.entry.map((entry) => {
        var pageID = entry.id;
        var timeOfEvent = entry.time;

        entry.messaging.map((messageItem) => {
          if (messageItem.message) {
            receivedMessage(messageItem);
          } else if (messageItem.postback) {
            receivedPostback(messageItem);
          } else {
            console.log('Webhook received unknow event: ', messageItem);
          }
        });
      });

      // Assume all went well
      return callback(null, {statusCode: 200, body: 'Ok'});
    } else {
      return callback('Not a page object');
    }
  }
};
