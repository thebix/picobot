import _config from './config'

export const logLevel = {
    ERROR: 'ERROR',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
}

export const dateTimeString = (date = new Date()) => `${date.toLocaleDateString()} ${(`0${date.getHours()}`).slice(-2)}:${(`0${date.getMinutes()}`).slice(-2)}:${(`0${date.getSeconds()}`).slice(-2)}` // eslint-disable-line max-len

export const log = (text, level = logLevel.DEBUG) => {
    if (!text) return
    if (_config.log === logLevel.DEBUG
        || (_config.log === logLevel.INFO && (level === logLevel.INFO || level === logLevel.ERROR))
        || (_config.log === logLevel.ERROR && level === logLevel.ERROR)) {
        const t = `${dateTimeString()} | ${level} | ${text}`
        if (level === logLevel.ERROR) {
            console.error(t)
            console.trace(t)
        } else
            console.log(t)
    }
}

export const l = (text, obj = 'zero') => {
    let msg
    if (typeof (text) === 'object') {
        msg = JSON.stringify(text)
    }
    if (obj !== 'zero') {
        msg = `${text} = ${JSON.stringify(obj)}`
    }
    log(msg, logLevel.DEBUG)
}
