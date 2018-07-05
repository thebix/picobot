import { Subscription, combineLatest } from 'rxjs'
import { filter, mergeMap } from 'rxjs/operators'
import nodeCleanup from 'node-cleanup'
import startBot from './bot/startBot'
import state, { storage } from './storage'
import { log, logLevel } from './logger'

log('Starting server', logLevel.INFO)

const compositeSubscription = new Subscription()

nodeCleanup((exitCode, signal) => {
    log(`server:nodeCleanup: clean. exitCode: <${exitCode}>, signal: <${signal}>`, logLevel.INFO)
    compositeSubscription.unsubscribe()
})

// bot
compositeSubscription.add(combineLatest(state.isInitialized(), storage.isInitialized())
    .pipe(
        filter(([isStateInitizlized, isStorageInitizlized]) => isStateInitizlized && isStorageInitizlized),
        mergeMap(() => startBot())
    )
    .subscribe(
        () => { },
        error => {
            log(`Unhandled exception: server.startBot: error while handling userText / userActions. Error=${error && error.message
                ? error.message : JSON.stringify(error)}`, logLevel.ERROR)
            compositeSubscription.unsubscribe()
        }
    ))
