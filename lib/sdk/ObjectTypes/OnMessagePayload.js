var BasePayload = require('./BasePayload.js');
var util        = require('util');

function OnMessagePayload(requestId, botId, componentId, opts){
    BasePayload.call(this, requestId, botId, componentId);
    this.payloadClassName   = 'OnMessagePayload';
    this._originalPayload   = opts;

    var sendUserMessageUrl  = opts.sendUserMessageUrl;
    this.sendUserMessageUrl = sendUserMessageUrl;
    var sendBotMessageUrl   = opts.sendBotMessageUrl;
    this.sendBotMessageUrl  = sendBotMessageUrl;
    this.resetBotUrl        = opts.resetBotUrl;
    this.baseUrl            = opts.baseUrl;

    this.context            = opts.context;
    this.channel            = opts.channel;
    this.message            = opts.message;
    this.agent_transfer     = opts.agent_transfer|| false;
    this.toJSON = function() {
        return {
            __payloadClass     : 'OnMessagePayload',
            requestId          : requestId,
            botId              : botId,
            componentId        : componentId,
            sendUserMessageUrl : sendUserMessageUrl,
            sendBotMessageUrl  : sendBotMessageUrl,
            context            : this.context,
            channel            : this.channel,
            message            : this.message,
            agent_transfer     : this.agent_transfer,
            baseUrl            : this.baseUrl,
            isTemplate         : this.isTemplate,
            metaInfo           : this.metaInfo,
            formattedMessage   : this.formattedMessage,
            overrideMessagePayload : this.overrideMessagePayload
        };
    };
}

util.inherits(OnMessagePayload, BasePayload);

module.exports = OnMessagePayload;
