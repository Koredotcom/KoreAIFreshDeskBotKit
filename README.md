# Kore.ai BotKit for FreshDesk

Kore.ai BotKit SDK is essential for enabling Freshdesk integration for bots built on Kora.ai bots platform. This BotKit comes prebuilt with all essential Freshdesk events like new ticket creation, addition of notes to tickets, enabling of two-way communication between end-users and your agents on Freshdesk and events to notify closure of tickets. You may review these prebuilt events in index.js file.

To enable BotKit, you need to create your app on Kore.ai platform, subscribe to Agent Transfer events and add Agent Transfer nodes as part of your Dialog tasks where required. Any user conversation, on reaching an Agent Transfer node, will be redirected to this BotKit for onward communication with your agents on Freshdesk.

Please update config.json file with account details (url, apikey and email) of your Freshdesk instance using which tickets are to be created. You also need to provide details (botid and botname) of your Kore.ai bot in config.json file.

Visit https://developer.kore.com/docs/bots/bot-builder/defining-bot-tasks/dialog-tasks/using-the-botkit-sdk/ for more configuration instructions and API documentation.
