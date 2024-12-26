declare class Logger {
    constructor(config?: Logger.LoggerConstructorOptions);
    URL: string;
    location: object;
    isLoggingAllowed(): boolean;
    debug(...args: any): any;
    error(...args: any): any;
    info(...args: any): any;
    log(...args: any): any;
    warn(...args: any): any;
    dir(...args: any): any;
    dirxml(...args: any): any;
    table(...args: any): any;
    trace(...args: any): any;
    group(...args: any): any;
    groupCollapsed(...args: any): any;
    groupEnd(...args: any): any;
    clear(...args: any): any;
    count(...args: any): any;
    countReset(...args: any): any;
    assert(...args: any): any;
    profile(...args: any): any;
    profileEnd(...args: any): any;
    time(...args: any): any;
    timeLog(...args: any): any;
    timeEnd(...args: any): any;
    timeStamp(...args: any): any;
    context(...args: any): any;
}

declare namespace Logger {
    export interface LoggerConstructorOptions {
        allowedHostnames?: string[]
        allowedQueryStringParameters?: string[],
        allowedPorts?: string[],
        disable?: boolean
    }
}

export = Logger;