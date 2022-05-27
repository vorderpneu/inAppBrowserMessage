var message = 'this is the message';
var messageObj = {my_message: message};
var stringifiedMessageObj = JSON.stringify(messageObj);
webkit.messageHandlers.cordova_iab.postMessage(stringifiedMessageObj);
