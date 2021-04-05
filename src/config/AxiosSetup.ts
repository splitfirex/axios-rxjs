import axios, { AxiosRequestConfig, AxiosInstance, AxiosPromise } from "axios";
import jwtDecode from 'jwt-decode'
import { debounce } from "rxjs/operators";

const verbose = process.env.NODE_ENV === 'development'
const log = (...args) => verbose && console.log(`${AxiosFactory.name}:`, ...args)
const warn = (...args) => verbose && console.warn(`${AxiosFactory.name}:`, ...args)
const critical = (...args) => verbose && console.error(`${AxiosFactory.name}:`, ...args)

const emptyFn = () => {}

const MSG_LOGOUT = "LOGOUT"

function getExpirationTime () {
    // const secondsAhead = EXPIRATION_SECS_AHEAD
    const nowSeconds = Math.ceil(Date.now() / 1000)
    return nowSeconds // + secondsAhead
}

function getLivingData (token) {
    if (token) {
        log('token =', token)
        const payload :any = jwtDecode(token)
        log('payload =', payload)
        log('payload expiration =', payload && new Date(payload.exp * 1000))
        if (payload.exp > getExpirationTime()) {
            log('token is valid and not expired.')
            return {
                token,
                payload
            }
        }
        log('token is expired.')
    }
    return null
}


export interface IAxiosFactoryConfig{
    defaults : AxiosRequestConfig
    accessTokenGetter? : () => void,
    accessTokenSetter? : (token : string) => void,
    refreshTokenGetter? : () => void,
    issueAccessToken? : (token : string) => void,
    loadingStateSetter? : (b : boolean) => void,
    logoutAction? : () => void
}


export default class AxiosFactory {

    static createInstance ({
        defaults,
        accessTokenGetter = emptyFn,
        accessTokenSetter = (token : string) => {},
        refreshTokenGetter = emptyFn,
        issueAccessToken = (token : string) => {},
        loadingStateSetter = (b : boolean) => {},
        logoutAction = emptyFn
    } : IAxiosFactoryConfig) {
        const axiosInstance = axios.create(defaults);
        const setLoadingState = loadingStateSetter


        async function handleAccessTokenData () {
            let accessData = getLivingData(await accessTokenGetter())
            log(`Access token data =`, accessData)
            if (!accessData) {
                const refreshData = getLivingData(await refreshTokenGetter())
                log(`Refresh token data =`, refreshData)
                if (refreshData) {
                    log(`Issuing new access token`)
                    accessData = getLivingData(await issueAccessToken(refreshData.token))
                    log('Issued access data =', accessData)
                    if (accessData) {
                        accessTokenSetter(accessData.token)
                    }
                }
            }
            return accessData
        }

          // REQUEST INTERCEPTOR --------------------------------------------------
          axiosInstance.interceptors.request.use(
            async (config :  any) => {
                log(`config =`, config)
                if (config.auth || config.requireToken === false) {
                    log(`Unprotected route ${config.url}.`)
                    config._isUnprotected = true
                    return config
                }
                log(`Protected route ${config.url}`)
                const accessData = await handleAccessTokenData()
                if (accessData) {
                    // SEND JWT WITH THE REQUEST
                    log(`Setting header Authorization with the access token`, { accessToken: accessData.token })
                    config.headers['Authorization'] = `Bearer ${accessData.token}`
                    setLoadingState(true)
                } else {
                    // CANCEL REQUEST AND LOGOUT
                    warn(`No living access/refresh token data`)
                    const cancelSource = axios.CancelToken.source()
                    config.cancelToken = cancelSource.token
                    cancelSource.cancel(MSG_LOGOUT)
                    warn(`Canceling operation. Response interceptor MUST call logoutAction().`)
                }
                return config
            },
            err => {
                warn(`Request interceptor error.`)
                return Promise.reject(err)
            }
        )

           // RESPONSE INTERCEPTOR ----------------------------------------------
           axiosInstance.interceptors.response.use(
            response => {
                setLoadingState(false)
                return response
            },
            async error => {
                setLoadingState(false)
                const config = error && error.config
                log(`Response interceptor got error...`)
                if (error instanceof axios.Cancel) {
                    log(`... it's a cancelation.`)
                    if (error.message === MSG_LOGOUT) {
                        log(`Detected logout cancelation. Logging out.`)
                        return logoutAction()
                    }
                } else if (config) {
                    // 401... if not retrying, retries sending new token
                    if (error.response.status === 401) {
                        if (config._retry) {
                            log(`Retried before. Logging out.`)
                            return logoutAction()
                        } else if (!config._isUnprotected) {
                            log(`Got a 401 (UNAUTHORIZED) response... will retry request with token.`)
                            config._retry = true // set retry flag
                            try {
                                const accessData = await handleAccessTokenData()
                                if (accessData) {
                                    // envia JWT junto ao request original
                                    log(`Setting header Authorization with the access token`, { accessToken: accessData.token })
                                    config.headers['Authorization'] = `Bearer ${accessData.token}`
                                    return config
                                } else {
                                    log(`No access data... logging out`)
                                    return logoutAction()
                                }
                            } catch (err) {
                                warn(`Error when retrying. Logging out. Error: ${err}`)
                                return logoutAction()
                            }
                        }
                    }
                }
                if (error.response) {
                    critical(`Response interceptor got an ${error.response.status}.`)
                } else {
                    critical(`Response interceptor got an unknown error!!!`)
                }
                return Promise.reject(error)
            }
        )

        return axiosInstance;

    }

}