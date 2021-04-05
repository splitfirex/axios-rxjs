import {defer, Observable} from 'rxjs';
import AxiosFactory from '../config/axiosSetup';
import { axiosRequestConfiguration } from '../config/AxiosRequestConfiguration';
import { map } from 'rxjs/operators';
import { AxiosResponse } from 'axios';

const axiosInstance = AxiosFactory.createInstance({defaults: axiosRequestConfiguration});

export const get = <T>(url: string, queryParams?: object): Observable<AxiosResponse<T>> => {
    return defer(()=> axiosInstance.get<T>(url, { params: queryParams }));
};

export const post = <T>(url: string, body: object, queryParams?: object): Observable<AxiosResponse<T>> => {
    return defer(()=> axiosInstance.post<T>(url, body, { params: queryParams }));
};

export const put = <T>(url: string, body: object, queryParams?: object): Observable<AxiosResponse<T>> => {
    return defer(()=>axiosInstance.put<T>(url, body, { params: queryParams }));
};

export const patch = <T>(url: string, body: object, queryParams?: object): Observable<AxiosResponse<T>> => {
    return defer(()=> axiosInstance.patch<T>(url, body, { params: queryParams }));
};

export const deleteR = <T>(url: string, id:number): Observable<T> => {
    return defer(() => (axiosInstance.delete(`${url}/${id}` )))
        .pipe(map(result => result.data)
    );
};
