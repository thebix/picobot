import _token from './token'

const isProduction = process.env.NODE_ENV === 'production'

export default {
    isProduction,
    log: isProduction ? 'INFO' : 'DEBUG',
    developers: _token.developers,
    dirStorage: `${__dirname}/state/`,
    fileState: `${__dirname}/state/state.json`
}
