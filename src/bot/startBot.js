import { merge, of, from, asapScheduler } from 'rxjs'
import process from 'process'
import { catchError, mergeMap, switchMap, map, filter, subscribeOn } from 'rxjs/operators'
import { log, logLevel } from '../logger'
import config from '../config'
import token from '../token'
import Telegram from './telegram'
import mapUserMessageToBotMessages, { mapUserActionToBotMessages } from './handlers'
import state, { archiveName } from '../storage'
import { IntervalTimerRx, timerTypes } from '../jslib/lib/timer'
import UserMessage from './message'
import lib from '../jslib/root'

const telegram = new Telegram(config.isProduction ? token.botToken.prod : token.botToken.dev)
// const wordsIntervalTimer = new IntervalTimerRx(timerTypes.SOON, 600)
// const dailyIntervalTimer = new IntervalTimerRx(timerTypes.DAILY)

// const getWordsToAskObservable = () =>
//     wordsIntervalTimer.timerEvent()
//         .pipe(
//             switchMap(() => state.getKeys()),
//             switchMap(chatIds => from(chatIds)),
//             filter(chatId => chatId !== archiveName),
//             switchMap(chatId => state.getItem('isActive', chatId)
//                 .pipe(
//                     filter(isActive => isActive === true),
//                     map(() => chatId)
//                 )),
//             map(chatId => UserMessage.createCommand(chatId, '/getcard')),
//             catchError(err => log(`startBot: getWordsToAskObservable: error: <${err}>`, logLevel.ERROR))
//         )

// const getCommandForStatsDailyObservable = () =>
//     dailyIntervalTimer.timerEvent()
//         .pipe(
//             switchMap(() => state.getKeys()),
//             switchMap(chatIds => from(chatIds)),
//             filter(chatId => chatId !== archiveName),
//             switchMap(chatId =>
//                 state.getItem('isActive', chatId)
//                     .pipe(
//                         filter(isActive => isActive === true),
//                         map(() => chatId)
//                     )),
//             map(chatId => {
//                 const statDate = lib.time.getStartDate(lib.time.getChangedDateTime({ days: -1 })).getDate()
//                 return UserMessage.createCommand(chatId, `/stat ${statDate} ${statDate}`)
//             }),
//             catchError(err => log(`startBot: getCommandForStatsDailyObservable: error: <${err}>`, logLevel.ERROR))
//         )

const mapBotMessageToSendResult = message => {
    const sendOrEditResultObservable = message.messageIdToEdit
        ? telegram.botMessageEdit(message)
        : telegram.botMessage(message)
    return sendOrEditResultObservable
        .pipe(
            switchMap(sendOrEditResult => {
                const { statusCode, messageText } = sendOrEditResult
                const { chatId } = message
                if (statusCode === 403) {
                    return state.archive(chatId)
                        .pipe(map(() => {
                            log(`startBot: chatId<${chatId}> forbidden error: <${messageText}>, message: <${JSON.stringify(message)}>, moving to archive`, logLevel.INFO) // eslint-disable-line max-len
                            return sendOrEditResult
                        }))
                }
                if (statusCode !== 200) {
                    log(`startBot: chatId<${chatId}> telegram send to user error: statusCode: <${statusCode}>, <${messageText}>, message: <${JSON.stringify(message)}>,`, logLevel.ERROR) // eslint-disable-line max-len
                }
                return of(sendOrEditResult)
            }),
            catchError(err => log(`startBot: getWordsToAskObservable: error: <${err}>`, logLevel.ERROR)) // eslint-disable-line max-len)
        )
}

export default () => {
    log('startBot.startstartBot()', logLevel.INFO)
    log(`Process PID: <${process.pid}>`)
    const userTextObservalbe =
        merge(
            // getWordsToAskObservable(),
            // getCommandForStatsDailyObservable(),
            telegram.userText(),
            telegram.userImage()
        ).pipe(
            subscribeOn(asapScheduler),
            mergeMap(mapUserMessageToBotMessages),
            mergeMap(mapBotMessageToSendResult)
        )
    const userActionsObservable = telegram.userActions()
        .pipe(
            subscribeOn(asapScheduler),
            mergeMap(mapUserActionToBotMessages),
            mergeMap(mapBotMessageToSendResult)
        )

    // wordsIntervalTimer.start()
    // dailyIntervalTimer.start()
    return lib.fs.mkDirIfNotExists(`${config.dirStorage}files`)
        .pipe(
            switchMap(() => merge(userTextObservalbe, userActionsObservable)),
            catchError(err => {
                log(err, logLevel.ERROR)
            })
        )
}
