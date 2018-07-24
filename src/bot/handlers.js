/*
 * INFO:
 *      - every handler should return Observable.from([BotMessage])
 */

import { of, from, combineLatest, empty } from 'rxjs'
import { catchError, concatMap, delay, mergeMap, map, filter, tap, mapTo } from 'rxjs/operators'

import { BotMessage, InlineButton, InlineButtonsGroup, ReplyKeyboard, ReplyKeyboardButton } from './message'
import commands from './commands'
import state, { storage } from '../storage'
import { log, logLevel } from '../logger'
import token from '../token'
import InputParser from './inputParser'
import config from '../config'
import { analyticsEventTypes, logEvent, getStartAndEndDates } from '../history/analytics'
import history from '../history/history'
import lib from '../jslib/root'

const lastCommands = {}

const TEXT_PICOBOT = '@picobot'

/*
 * ERRORS HANDERS
 */
const errorToUser = (userId, chatId) => [
    new BotMessage(
        userId, chatId,
        'При при обработке запроса произошла ошибка. Пожалуйста, начните заново'
    )]

const botIsInDevelopmentToUser = (userId, chatId) => {
    log(`handlers.botIsInDevelopmentToUser: userId="${userId}" is not in token.developers array.`, logLevel.ERROR)
    return from([
        new BotMessage(
            userId, chatId,
            `В данный момент бот находится в режиме разработки. \nВаш идентификатор в мессенджере - "${userId}". Сообщите свой идентификатор по контактам в описании бота, чтобы Вас добавили в группу разработчиков` // eslint-disable-line max-len
        )])
}

/*
 * COMMON METHODS
 */
export const dateTimeString = (date = new Date()) => `${date.toLocaleDateString()} ${(`0${date.getHours()}`).slice(-2)}:${(`0${date.getMinutes()}`).slice(-2)}:${(`0${date.getSeconds()}`).slice(-2)}` // eslint-disable-line max-len

const storageId = (userId, chatId) => `${chatId}_${userId}`

/*
 * HANDLERS
 */
/*
 * USER MESSAGE HELPERS
 */
const start = (userId, chatId, messageId, firstAndLastName, username) => {
    lastCommands[storageId(userId, chatId)] = commands.START
    return state.updateItemsByMeta([{
        isActive: true,
        user: {
            name: firstAndLastName,
            username
        }
    }], storageId(userId, chatId))
        .pipe(
            tap(() => logEvent(messageId, storageId(userId, chatId), analyticsEventTypes.START)),
            mergeMap(isStorageUpdated => {
                if (!isStorageUpdated) {
                    log(`handlers.start: userId="${userId}" state wasn't updated / created.`, logLevel.ERROR)
                    return from(errorToUser(userId, chatId))
                }
                return from([
                    new BotMessage(
                        userId, chatId,
                        `Привет! Чтобы остановить меня введи /stop.
Добавь меня ${TEXT_PICOBOT} в чат, куда надо будет отправлять картинки, и возвращайся сюда`
                    )])
            })
        )
}

const startPicobot = (userId, chatId, messageId, chatName) => {
    lastCommands[storageId(userId, chatId)] = commands.START

    // TODO: check bot is already in chat
    return state.updateItemsByMeta([{
        isActive: true,
        chat: {
            isChat: true,
            name: chatName
        }
    }], storageId(userId, chatId))
        .pipe(
            tap(() => logEvent(messageId, storageId(userId, chatId), analyticsEventTypes.START)),
            mergeMap(isStorageUpdated => {
                if (!isStorageUpdated) {
                    log(`handlers.start: userId="${userId}", chatId="${chatId}" state wasn't updated / created.`, logLevel.ERROR)
                    return from(errorToUser(userId, chatId))
                }

                const userChats = storage.get('chats', storageId(userId, userId)) || {}
                const newUserChats = Object.assign({}, userChats, { chatId })
                return storage.updateItem('chats', newUserChats, storageId(userId, userId))
            }),
            mergeMap(isStorageUpdated => {
                if (!isStorageUpdated) {
                    log(`handlers.start: userId="${userId}", chatId="${chatId}" storage chats weren't updated / created.`, logLevel.ERROR)
                    return from(errorToUser(userId, chatId))
                }

                const chatUsers = storage.get('users', storageId(userId, chatId)) || {}
                const newChatUsers = Object.assign({}, chatUsers, { userId })
                return storage.updateItem('users', newChatUsers, storageId(userId, chatId))
            }),
            mergeMap(isStorageUpdated => {
                if (!isStorageUpdated) {
                    log(`handlers.start: userId="${userId}, chatId="${chatId}" storage users weren't updated / created.`, logLevel.ERROR)
                    return from(errorToUser(userId, chatId))
                }
                return from([
                    new BotMessage(
                        userId, chatId,
                        'Я все понял, го в директ'
                    ),
                    new BotMessage(
                        userId, userId,
                        `Бот добавлен в чат "${chatName}". Теперь при добавлении картинки, чат будет доступен для рассылки`
                    )])
            })
        )
}

const stop = (userId, chatId, messageId) => {
    lastCommands[storageId(userId, chatId)] = undefined
    return state.archive(storageId(userId, chatId))
        .pipe(
            tap(() => logEvent(messageId, storageId(userId, chatId), analyticsEventTypes.STOP)),
            mergeMap(isStateUpdated => {
                if (!isStateUpdated) {
                    log(`handlers.stop: userId="${userId}" state wasn't updated.`, logLevel.ERROR)
                    return from(errorToUser(userId, chatId))
                }
                return from([
                    new BotMessage(
                        userId, chatId,
                        'Пока пока'
                    )])
            })
        )
}

const addPicture = (userId, chatId, messageId, photo = {}) => {
    lastCommands[storageId(userId, chatId)] = undefined
    const filesDir = `${config.dirStorage}files/${storageId(userId, chatId)}`
    return lib.fs.mkDirIfNotExists(filesDir)
        // TODO: Analytics
        .pipe(
            mergeMap(() => {
                const fileUrl = `https://api.telegram.org/file/bot${config.isProduction ? token.botToken.prod : token.botToken.dev}/${photo.fileUrl}`
                return lib.fs.downloadFile(fileUrl, `${filesDir}/${new Date().getTime()}.${photo.fileUrl.split('.').reverse()[0]}`)
            }),
            mergeMap(file => {
                const userStorageId = storageId(userId, userId)
                const files = storage.get('files', userStorageId) || {}
                const fileName = file.path.split('/').reverse()[0]
                files[fileName] = { path: file.path }
                return storage.updateItem('files', files, userStorageId)
            }),
            mergeMap(file => {
                return from([
                    new BotMessage(
                        userId, chatId, 'Настройки',
                        [
                            new InlineButtonsGroup([
                                new InlineButton('Сегодня', 'today'),
                                new InlineButton('Завтра', 'tomorrow'),
                                new InlineButton('Послезавтра', 'dayaftertomorrow')]),
                            new InlineButtonsGroup([
                                new InlineButton('20:30', '20:30'),
                                new InlineButton('08:00', '08:00'),
                                new InlineButton('19:30', '19:30')]),
                            new InlineButtonsGroup([
                                new InlineButton('22:30', '22:30'),
                                new InlineButton('14:00', '14:00')])
                        ]
                        // TODO: available chats
                    )
                ])
            })
            // TODO: catchError
        )
    // TODO: save file
}

const help = (userId, chatId) => {
    lastCommands[storageId(userId, chatId)] = commands.HELP
    return from([
        new BotMessage(
            userId, chatId,
            'Помощь\nЗдесь могла бы быть помощь.'
        )])
}

const tokenInit = (userId, chatId, text) => {
    // return new BotMessage(userId, chatId, 'Токен принят')
    const tokenKey = text.split(' ')[1]
    if (Object.keys(token.initData).indexOf(tokenKey) === -1)
        return from([new BotMessage(userId, chatId, 'Токен не найден')])

    const initDataItems = token.initData[tokenKey]
    const dataItems = Object.keys(initDataItems)
        .map(key => ({
            [key]: initDataItems[key]
        }))
    return storage.updateItemsByMeta(dataItems, storageId(userId, chatId))
        .pipe(mergeMap(isStorageUpdated => (
            !isStorageUpdated
                ? from(errorToUser(userId, chatId))
                : from([new BotMessage(userId, chatId, 'Токен принят')])
        )))
}


/*
 * EXPORTS
 */
const mapUserMessageToBotMessages = message => { // eslint-disable-line complexity
    const {
        text = '', from: messageFrom, chat, user, id: messageId
    } = message
    const chatId = chat ? chat.id : messageFrom
    const {
        lastName, firstName, username
    } = user

    let messagesToUser
    if (!config.isProduction && !InputParser.isDeveloper(messageFrom)) {
        lastCommands[storageId(messageFrom, chatId)] = undefined
        messagesToUser = botIsInDevelopmentToUser(messageFrom, chatId)
    } else if (InputParser.isStart(text)) {
        lastCommands[storageId(messageFrom, chatId)] = undefined
        if (messageFrom !== chatId) {
            messagesToUser = startPicobot(messageFrom, chatId, messageId, chat.title)
        } else {
            messagesToUser = start(messageFrom, chatId, messageId, `${firstName || ''} ${lastName || ''}`, username)
        }
    } else if (InputParser.isStop(text)) {
        lastCommands[storageId(messageFrom, chatId)] = undefined
        messagesToUser = stop(messageFrom, chatId, messageId)
    } else if (message.photo) {
        lastCommands[storageId(messageFrom, chatId)] = undefined
        messagesToUser = addPicture(messageFrom, chatId, messageId, message.photo)
    }

    else if (InputParser.isHelp(text)) {
        messagesToUser = help(messageFrom, chatId)
    } else if (InputParser.isToken(text)) {
        lastCommands[storageId(messageFrom, chatId)] = undefined
        messagesToUser = tokenInit(messageFrom, chatId, text)
    }
    // } else if (InputParser.isCardRemove(text)) {
    // else if (InputParser.isCardUserAnswer(lastCommands[storageId(messageFrom, chatId)])) {
    //     messagesToUser = cardUserAnswer(messageFrom, chatId, text, messageId)
    // }
    if (!messagesToUser) {
        messagesToUser = help(from, chatId)
    }

    return from(messagesToUser)
        .pipe(
            concatMap(msgToUser => of(msgToUser)
                .pipe(delay(10))),
            catchError(err => {
                log(`message: <${JSON.stringify(message)}>, Error: ${err}`, logLevel.ERROR)
            })
        )
}

export const mapUserActionToBotMessages = userAction => { // eslint-disable-line complexity
    const { message, data = {} } = userAction
    const { from: messageFrom, chat, id: messageId } = message
    const chatId = chat ? chat.id : messageFrom
    const callbackCommand = data.cmd || undefined
    let messagesToUser
    // if (InputParser.isCardUserAnswerDontKnow(callbackCommand)) {
    //     messagesToUser = cardUserAnswerDontKnow(messageFrom, chatId, data.word, messageId)
    // } else if (InputParser.isCardGetCurrentCallbackButton(callbackCommand)) {
    //     messagesToUser = cardGetCurrent(messageFrom, chatId, messageId)
    // } else {
    log(
        `handlers.mapUserActionToBotMessages: can't find handler for user action callback query. userId=${messageFrom}, chatId=${chatId}, data=${JSON.stringify(data)}`, // eslint-disable-line max-len
        logLevel.ERROR
    )
    messagesToUser = errorToUser(messageFrom, chatId)
    // }

    return from(messagesToUser)
        .pipe(
            concatMap(msgToUser => of(msgToUser)
                .pipe(delay(10))),
            catchError(err => {
                log(err, logLevel.ERROR)
            })
        )
}

export default mapUserMessageToBotMessages
