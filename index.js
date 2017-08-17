var Application = require("./lib/app");
var Server = require("./lib/server");
var sdk = require("./lib/sdk");
var ObjectTypes = require("./lib/sdk/ObjectTypes");
var config = require("./config");
var freshdeskApi = require("./freshdesk/api");
var Websocket = require("ws");
var _ = require("lodash");
var crypto = require("crypto");

var freshdesk = new freshdeskApi(config.freshDesk.url, config.freshDesk.apikey);
var botId = config.botInfo.botId;
var botName = config.botInfo.botName;

var app = new Application(null, config);
var server = new Server(config, app);

var userDataMap = {};
var _userMsgData = {};
server.start();

var wsURL = "8a5aa69d.ngrok.io/freshdeskws";
var userStatusURL = "73c5dacd.ngrok.io" + config.app.apiPrefix + '/userstatus/';

var allowCrossDomain = function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');

    if ('OPTIONS' == req.method) {
        res.sendStatus(200);
    }
    else {
        next();
    }
};

app.app.use(config.app.apiPrefix + '/userstatus', allowCrossDomain);

app.app.get(config.app.apiPrefix + '/userstatus/:visitorId', function (req, res) {
    var visitorId = req.params.visitorId;
    var response = {status: "online"};
    if (!_userMsgData[visitorId]) {
        response.status = "offline";
    } else if (_userMsgData[visitorId] && _userMsgData[visitorId].isInProgress) {
        response.status = "inProgress";
    }
    res.json(response);
});

function createTicket(visitorId) {
    var message = '<div style="padding: 20px;width: 400px;margin: 0 auto;">';
    var messages = _userMsgData[visitorId].messages;
    messages.forEach(function (msg) {
        message += msg;
        message += "\r\n";
    });
    message += "</div><span style='display: none'>" + visitorId + "###" + wsURL + "###@@@" + userStatusURL + "@@@</span>";
    freshdesk.createTicket({
        name: botName + ' :: Conversation With User',
        email: config.freshDesk.email,
        subject: 'Conversation with Bot : ' + botName,
        description: message,
        status: 2,
        priority: 1
    }, function (err, data) {
        if (err)
            console.log(err);
        else {
            _userMsgData[visitorId].freshDeskTicketId = "" + data.id;
            console.log("FreshDesk Ticket Created with ID :: " + data.id);
        }
    })
}

function createNoteToTicket(agentChatHistory, ticketId) {
    var message = '<div style="padding: 20px;width: 400px;margin: 0 auto;">';
    var messages = agentChatHistory;
    messages.forEach(function (msg) {
        message += msg;
        message += "\r\n";
    });
    freshdesk.createNote(ticketId, {
        "body": message,
        "private": false
    }, function (err, data) {
        if (err)
            console.log(err);
        else {
            console.log("FreshDesk => Note added to ticket :: " + ticketId);
        }
    })
}

function connectToAgent(requestId, data, cb) {
    var visitorId = _.get(data, 'channel.channelInfos.from');
    if (!visitorId) {
        visitorId = _.get(data, 'channel.from');
    }
    console.log("EVENT => on_agent_transfer => " + visitorId);
    userDataMap[visitorId] = data;
    data.message = "Transferring to agent. Now you will chat with agent!!!";
    sdk.sendUserMessage(data, cb);
    createTicket(visitorId);
}

var wss = new Websocket.Server({port: 8041});
var _ws;
sdk.registerBot({
    botId: botId,
    botName: botName,
    on_user_message: function (requestId, data, callback) {
        console.log("EVENT => on_user_message" , data);
        console.log("\n\n\n\n\n\n _------------------------------------------------");
        if(data.context.session.BotUserSession.locationInfo) {
            data.metaInfo = {
                nlMeta : {
                    locationInfo: data.context.session.BotUserSession.locationInfo
                }
            }
        }
        var visitorId = _.get(data, 'channel.channelInfos.from');
        if (!visitorId) {
            visitorId = _.get(data, 'channel.from');
        }

        if (data.agent_transfer) {
            if (!_ws || data.message === "end_chat") {
                console.log("EVENT => Agent Chat End Request");
                data.message = "end_chat";
                if (visitorId && _userMsgData[visitorId])
                    createNoteToTicket(_.cloneDeep(_userMsgData[visitorId].agentChatMessagesHTML), _userMsgData[visitorId].freshDeskTicketId);
                sdk.clearAgentSession(data, function (resp) {
                    if (_userMsgData[visitorId])
                        delete _userMsgData[visitorId];
                    console.log("Agent Session Ended");
                });
                return;
            }
            _userMsgData[visitorId].agentChatMessagesHTML.push("<div style='width: 100%;display: table;'><div style='float: right; margin: 5px 20px 5px 45px; background-color: #009DAB; color:#fff; border-radius: 5px; box-shadow: 0 0 6px #B2B2B2; display: inline-block; padding: 10px 18px; position: relative; vertical-align: top;'><b>User : </b>" + data.message + "</div></div>");
            _userMsgData[visitorId].agentChatHistoryData.push({user: data.message, msgData: data});
            _ws.send(JSON.stringify(data));
            console.log(visitorId + " => sent_message_to_agent");
        } else {
            if (_userMsgData[visitorId]) {
                _userMsgData[visitorId].isInProgress = false;
                _userMsgData[visitorId].messages.push("<div style='width: 100%;display: table;'><div style='float: right; margin: 5px 20px 5px 45px; background-color: #009DAB; color:#fff; border-radius: 5px; box-shadow: 0 0 6px #B2B2B2; display: inline-block; padding: 10px 18px; position: relative; vertical-align: top;'><b>User : </b>" + data.message + "</div></div>");
                _userMsgData[visitorId].msgData.push({user: data.message, msgData: data});
            } else {
                _userMsgData[visitorId] = {
                    messages: [],
                    msgData: [],
                    agentChatHistoryData: [],
                    agentChatMessagesHTML: [],
                    isInProgress: false
                };
            }
            console.log(visitorId + " => sent_message_to_bot");
            return sdk.sendBotMessage(data, callback);
        }
    },
    on_bot_message: function (requestId, data, callback) {
        console.log("EVENT => on_bot_message", data);
        console.log("\n\n\n\n\n\n _------------------------------------------------");
        var visitorId = _.get(data, 'channel.from');
        if (_userMsgData[visitorId]) {
            _userMsgData[visitorId].messages.push("<div style='width: 100%;display: table;'><div style='background-color: #F1F0F0; border-radius: 5px; box-shadow: 0 0 6px #B2B2B2;float: left; margin: 5px 45px 5px 20px;  display: inline-block; padding: 10px 18px; position: relative; vertical-align: top;'><b>" + botName + " : </b>" + data.message + "</div></div>");
            _userMsgData[visitorId].msgData.push({bot: data.message, msgData: data});
        } else {
            _userMsgData[visitorId] = {
                messages: [],
                msgData: [],
                agentChatHistoryData: [],
                agentChatMessagesHTML: [],
                isInProgress: false
            };
        }
        return sdk.sendUserMessage(data, callback);
    },
    on_agent_transfer: function (requestId, data, callback) {
        return connectToAgent(requestId, data, callback);
    }
});

wss.on('connection', function connection(ws, req) {
    _ws = ws;
    ws.on('message', function incoming(message) {
        message = JSON.parse(message);
        console.log("EVENT => onMessage", message);
        if (message.visitorId) {
            var visitorId = message.visitorId;
            visitorId = visitorId.split("/")[0];
            //console.log(visitorId, _userMsgData[visitorId]);
            if (_userMsgData[visitorId]) {
                _userMsgData[visitorId].isInProgress = true;
                _ws.send(JSON.stringify({prevChat: _userMsgData[visitorId].msgData}));
            }
        }
        if (message && message.message && message.__payloadClass) {
            var visitorId = _.get(message, 'channel.channelInfos.from');
            if (!visitorId) {
                visitorId = _.get(message, 'channel.from');
            }
            var ObjectType = ObjectTypes[message.__payloadClass];
            var msg = new ObjectType(message.requestId, message.botId, message.componentId, message);
            if (msg.message === "end_chat") {
                console.log("EVENT => Agent Chat End Request");
                if (visitorId && _userMsgData[visitorId])
                    createNoteToTicket(_.cloneDeep(_userMsgData[visitorId].agentChatMessagesHTML), _userMsgData[visitorId].freshDeskTicketId);
                sdk.clearAgentSession(msg, function (resp) {
                    if (visitorId && _userMsgData[visitorId])
                        delete _userMsgData[visitorId];
                    console.log("Agent Session Ended");
                });
            } else {
                if (visitorId && _userMsgData[visitorId]) {
                    _userMsgData[visitorId].agentChatMessagesHTML.push("<div style='width: 100%;display: table;'><div style='background-color: #F1F0F0; border-radius: 5px; box-shadow: 0 0 6px #B2B2B2;float: left; margin: 5px 45px 5px 20px;  display: inline-block; padding: 10px 18px; position: relative; vertical-align: top;'><b>Agent : </b>" + message.message + "</div></div>");
                    _userMsgData[visitorId].agentChatHistoryData.push({bot: message.message, msgData: message});
                }
                sdk.sendUserMessage(msg, function (resp) {
                    console.log("Sent User Message");
                });
            }
        }
    });

});
