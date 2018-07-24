import TelegramBot from 'node-telegram-bot-api'
import { fromEvent, of } from 'rxjs'
import { map, tap, catchError, switchMap } from 'rxjs/operators'
import { fromPromise } from 'rxjs/observable/fromPromise'

import { log, logLevel } from '../logger'
import UserMessage, { UserAction, BotMessageSendResult } from './message'

const botMessageOptions = (
    inlineButtonsGroups = undefined,
    replyKeyboard = undefined,
    editMessageId = undefined,
    editMessageChatId = undefined
) => {
    const options = {
        message_id: editMessageId,
        chat_id: editMessageChatId,
        reply_markup: {}
    }
    if (inlineButtonsGroups && Array.isArray(inlineButtonsGroups)) {
        options.reply_markup.inline_keyboard =
            inlineButtonsGroups.map(inlineButtonsGroup =>
                inlineButtonsGroup.inlineButtons
                    .map(inlineButton => ({
                        text: inlineButton.text,
                        callback_data: JSON.stringify(inlineButton.callbackData)
                    })))
    }
    if (replyKeyboard && replyKeyboard.buttons && Array.isArray(replyKeyboard.buttons)) {
        const {
            buttons = [],
            resizeKeyboard = false,
            oneTimeKeyboard = false,
            selective = false
        } = replyKeyboard

        options.reply_markup.resize_keyboard = resizeKeyboard
        options.reply_markup.one_time_keyboard = oneTimeKeyboard
        options.reply_markup.selective = selective
        options.reply_markup.keyboard =
            buttons.map(item => [{
                text: item.text
            }])
    }
    return options
}

export default class Telegram {
    constructor(token) {
        if (!token) {
            log('Telegram: You should provide a telegram bot token', logLevel.ERROR)
            throw new Error('Telegram: You should provide a telegram bot token')
        }
        this.bot = new TelegramBot(token, { polling: true, webHook: false })
    }
    userText() {
        return fromEvent(this.bot, 'text')
            .pipe(map(msg => UserMessage.createFromTelegramMessage(msg[0])))
    }
    userImage() {
        return fromEvent(this.bot, 'photo')
            .pipe(switchMap(msg => {
                const userMessage = UserMessage.createFromTelegramPhoto(msg[0])
                if (!userMessage.photo.fileUrl) {
                    return fromPromise(this.bot.getFile(userMessage.photo.id))
                        .pipe(map(file => {
                            userMessage.photo.fileUrl = file.file_path
                            return userMessage
                        }))
                }
                return of(userMessage)
            }))
    }
    userActions() {
        return fromEvent(this.bot, 'callback_query')
            .pipe(
                tap(userAction => this.bot.answerCallbackQuery(userAction.id, {
                    text: 'Команда получена',
                    show_alert: false
                })),
                map(userAction => UserAction.createFromTelegramUserAction(userAction))
            )
    }
    botMessage({
        chatId, text, inlineButtonsGroups, replyKeyboard
    }) {
        return fromPromise(this.bot.sendMessage(
            chatId, `${text} 🤖`,
            botMessageOptions(inlineButtonsGroups, replyKeyboard)
        ))
            .pipe(
                map(botMessageSendSuccess => BotMessageSendResult.createFromSuccess(botMessageSendSuccess)),
                catchError(botMessageSendError => of(BotMessageSendResult.createFromError(botMessageSendError)))
            )
    }
    botMessageEdit({
        chatId, text, inlineButtonsGroups, messageIdToEdit
    }) {
        return fromPromise(this.bot.editMessageText(
            `${text} 🤖`,
            botMessageOptions(inlineButtonsGroups, undefined, messageIdToEdit, chatId)
        ))
            .pipe(
                map(botMessageSendSuccess => BotMessageSendResult.createFromSuccess(botMessageSendSuccess)),
                catchError(botMessageSendError => of(BotMessageSendResult.createFromError(botMessageSendError)))
            )
    }
    chatInfo(chatId) {
        return fromPromise(this.bot.getChat(chatId))
    }
}
