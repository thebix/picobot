// https://core.telegram.org/bots/api#user

export const USER_ID_UNUSED = 'userId_unused'

/*
 *   FROM USER
 */
export default class UserMessage {
    constructor(msg) {
        this.id = msg.id
        this.from = msg.from
        this.text = msg.text
        this.user = msg.user
        this.chat = msg.chat
    }

    static createFromTelegramMessage(msg) {
        return new UserMessage({
            id: msg.message_id,
            from: msg.from.id,
            text: msg.text,
            user: {
                id: msg.from.id,
                firstName: msg.from.first_name,
                lastName: msg.from.last_name,
                username: msg.from.username
            },
            chat: {
                id: msg.chat.id,
                type: msg.chat.type,
                title: msg.chat.title,
                username: msg.chat.username,
                firstName: msg.chat.first_name,
                lastName: msg.chat.last_name,
                allMembersAdmins: msg.chat.all_members_are_administrators
            }
        })
    }
    static createFromTelegramUserAction(userAction) {
        // INFO: message.user = bot, from = user
        const { message, from } = userAction
        return new UserMessage({
            id: message.message_id,
            from: from.id,
            text: message.text,
            user: {
                id: from.id,
                firstName: from.first_name,
                lastName: from.last_name,
                username: from.username
            },
            chat: {
                id: message.chat.id,
                type: message.chat.type,
                title: message.chat.title,
                username: message.chat.username,
                firstName: message.chat.first_name,
                lastName: message.chat.last_name,
                allMembersAdmins: !!message.chat.all_members_are_administrators
            }
        })
    }
    // create command to handler to imitate user input
    static createCommand(chatId, text) {
        return new UserMessage({
            id: -1,
            from: USER_ID_UNUSED,
            text,
            user: {
                id: USER_ID_UNUSED,
                firstName: 'firstName_unused',
                lastName: 'lastName_unused',
                username: 'username_unused'
            },
            chat: {
                id: chatId,
                type: 'chatType_unused',
                title: 'chatTitle_unused',
                username: 'chatUsername_unused',
                firstName: 'chatFirstName_unused',
                lastName: 'chatLastName_unused',
                allMembersAdmins: false
            }
        })
    }
    static createFromTelegramPhoto(msg) {
        return this.createFromTelegramMessage(msg)
    }
}

export class UserAction {
    constructor({ data, message }) {
        this.data = data
        this.message = message
    }

    static createFromTelegramUserAction(userAction) {
        const { data } = userAction
        return {
            data: data ? JSON.parse(data) : {},
            message: UserMessage.createFromTelegramUserAction(userAction)
        }
    }
}

/*
 *  TO USER
 */
// https://core.telegram.org/bots/api#inlinekeyboardmarkup
export class InlineButton {
    constructor(text, callbackData) {
        this.text = text
        this.callbackData = callbackData
    }
}
export class InlineButtonsGroup {
    constructor(inlineButtonsArray = []) {
        this.inlineButtons = inlineButtonsArray
    }
}

// https://core.telegram.org/bots/api#replykeyboardmarkups
export class ReplyKeyboard {
    constructor(buttons = [], resizeKeyboard = true, oneTimeKeyboard = false, selective = false) {
        this.buttons = buttons
        this.resizeKeyboard = resizeKeyboard
        this.oneTimeKeyboard = oneTimeKeyboard
        this.selective = selective
    }
}
export class ReplyKeyboardButton {
    constructor(text) {
        this.text = text
    }
}

// send or edit message from bot to user
export class BotMessage {
    // INFO: userId, chatId, text - reqired params
    constructor(
        userId,
        chatId,
        text = '',
        inlineButtonsGroups = undefined,
        replyKeyboard = undefined
    ) {
        this.userId = userId
        this.chatId = chatId
        this.text = text
        this.inlineButtonsGroups = inlineButtonsGroups
        this.replyKeyboard = replyKeyboard
    }
}
export class BotMessageEdit extends BotMessage {
    constructor(messageIdToEdit, chatId, text, inlineButtons) {
        super('userId_not_needed', chatId, text, inlineButtons)
        this.messageIdToEdit = messageIdToEdit
    }
}

export class BotMessageSendResult {
    constructor({
        chatId, messageText, statusCode, statusMessage, ok, messageId
    }) {
        this.chatId = chatId
        this.messageId = messageId
        this.messageText = messageText
        this.statusCode = statusCode
        this.statusMessage = statusMessage
        this.ok = ok
    }

    static createFromSuccess(botMessageSendSuccess) {
        const { message_id: messageId, chat } = botMessageSendSuccess
        const { id: chatId } = chat
        return new BotMessageSendResult({
            chatId,
            messageId,
            statusCode: 200,
            statusMessage: 'ok',
            ok: true
        })
    }
    static createFromError(botMessageSendError) {
        const { message } = botMessageSendError
        const { statusCode, statusMessage, body } = botMessageSendError.response
        const { ok } = body
        return new BotMessageSendResult({
            messageText: message,
            statusCode,
            statusMessage,
            ok
        })
    }
}
