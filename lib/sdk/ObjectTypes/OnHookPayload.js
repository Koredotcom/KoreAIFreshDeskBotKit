var BasePayload           = require('./BasePayload.js');
var DialogObject          = require('./DialogObject');
var util                  = require('util');
var getDialogFromPlatform = require("../lib/getDialog");
var errors                = require("../../app/errors");
var Promise               = require("bluebird");

function OnHookPayload(requestId, botId, componentId, opts) {
    BasePayload.call(this, requestId, botId, componentId);
    this.payloadClassName = 'OnHookPayload';
    this._originalPayload = opts;

    var callbackUrl       = opts.callbackUrl;
    this.callbackUrl      = opts.callbackUrl;

    this.context          = opts.context;
    this.channel          = opts.channel;
    this.message          = opts.message;
    var componentName     = opts.dialogComponentName;
    this.componentName    = opts.dialogComponentName;
    this.contextId        = opts.contextId;

    var sendUserMessageUrl  = opts.sendUserMessageUrl;
    this.sendUserMessageUrl = sendUserMessageUrl;
    var sendBotMessageUrl   = opts.sendBotMessageUrl;
    this.sendBotMessageUrl  = sendBotMessageUrl;
    this.resetBotUrl        = opts.resetBotUrl;
    this.baseUrl            = opts.baseUrl;

    this.toJSON = function() {
        return {
            __payloadClass : 'OnHookPayload',
            requestId      : requestId,
            botId          : botId,
            componentId    : componentId,
            componentName  : componentName,
            sendUserMessageUrl : sendUserMessageUrl,
            sendBotMessageUrl  : sendBotMessageUrl,
            callbackUrl    : callbackUrl,
            context        : this.context,
            channel        : this.channel,
            message        : this.message,
            contextId      : this.contextId
        };
    };

    this.getDialog = function(callback) {
        var self = this;
        if (!opts.getDialogUrl) {
            throw new errors.InsufficientArguments();
        }
        if (self.dialog) {
            return Promise.resolve(self.dialog)
                .nodeify(callback);
        }

        return getDialogFromPlatform(opts.getDialogUrl)
            .then(function(dialog) {
                self.dialog = new DialogObject(dialog);
                return self.dialog;
            })
            .nodeify(callback);
    };
}

util.inherits(OnHookPayload, BasePayload);

module.exports = OnHookPayload;
