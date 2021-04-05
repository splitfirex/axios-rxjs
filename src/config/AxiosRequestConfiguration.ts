import { AxiosRequestConfig } from 'axios';

export var axiosRequestConfiguration: AxiosRequestConfig | any = {
    responseType: 'json',
    requireToken: false,
    headers: {
        'Content-Type': 'application/json',
    },
};