import token from '../token'
import commands from './commands'
import { USER_ID_UNUSED } from './message'

export default class InputParser {
    static isDeveloper(id) {
        return USER_ID_UNUSED === id
            || (token.developers
                && token.developers.length > 0
                && token.developers.some(x => x === id))
    }
    static isEcho() {
        return true
    }
    static isStart(text) {
        const pattern = /^\/start|старт/i
        return text.match(pattern)
    }
    static isStop(text) {
        const pattern = /^\/stop|стоп/i
        return text.match(pattern)
    }
    static isHelp(text) {
        const pattern = /^\/help|помощь/i
        return text.match(pattern)
    }
    static isToken(text) {
        const pattern = /^\/token/i
        return text.match(pattern)
    }
    // static isCardGetCurrent(text) {
    //     const pattern = /^\/getcard/i
    //     return text.match(pattern)
    // }
    // static isCardUserAnswer(lastCommand) {
    //     return lastCommand === commands.CARD_GET_CURRENT
    // }
    // static isCardUserAnswerDontKnow(callbackCommand) {
    //     return callbackCommand === commands.CARD_DONT_KNOW
    // }
    // static isCardAdd(text) {
    //     const pattern = /^\/addcard/i
    //     return text.match(pattern)
    // }
    // static isCardAddUserResponse(lastCommand) {
    //     return lastCommand === commands.CARD_ADD
    // }
    // static isCardGetList(text) {
    //     const pattern = /^\/getlist/i
    //     return text.match(pattern)
    // }
    // static isCardRemove(text) {
    //     const pattern = /^\/remove/i
    //     return text.match(pattern)
    // }
    // static isStats(text) {
    //     const pattern = /^\/stat|stats/i
    //     return text.match(pattern)
    // }
    // static isCardGetCurrentCallbackButton(callbackCommand) {
    //     return callbackCommand === commands.CARD_GET_CURRENT
    // }
}
