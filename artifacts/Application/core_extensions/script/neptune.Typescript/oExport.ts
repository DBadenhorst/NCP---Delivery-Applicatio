namespace Ext {

    export namespace Sap {
        export namespace DateTime {    
            export function getDate(): string {
                const today = new Date();

                return [
                    today.getFullYear().toString(),
                    today.getMonth().toString().padStart(2, '0'),
                    today.getDate().toString().padStart(2, '0')
                ].join('');
            }

            export function getTime(): string {
                const today = new Date();

                return [
                    today.getHours().toString(),
                    today.getMinutes().toString().padStart(2, '0'),
                    today.getSeconds().toString().padStart(2, '0')
                ].join('');
            }

            export function formatDate(date: Date): string {
                return [
                    date.getFullYear().toString(),
                    date.getMonth().toString().padStart(2, '0'),
                    date.getDate().toString().padStart(2, '0')
                ].join('');
            }

            export function formatTime(date: Date): string {
                return [
                    date.getHours().toString(),
                    date.getMinutes().toString().padStart(2, '0'),
                    date.getSeconds().toString().padStart(2, '0')
                ].join('');
            }

            export function formatDateAndOrTimeToJS(sapDate: string, sapTime?: string): Date {
                let year = parseInt(sapDate.substr(0, 4));
                let month = parseInt(sapDate.substr(4, 2));
                let day = parseInt(sapDate.substr(6, 2));
                let hours = 0, minutes = 0, seconds = 0;

                if (sapTime) {
                    hours = parseInt(sapTime.substr(0, 2));
                    minutes = parseInt(sapTime.substr(2, 2));
                    seconds = parseInt(sapTime.substr(4, 2));
                }

                if (!sapTime) {
                    return new Date(year, month, day);
                }

                return new Date(year, month, day, hours, minutes,seconds);
            }
        }
    }

    export namespace Objects {
        export function convertKeysToLowerCase(obj) {
            const output = Object.prototype.toString.apply(obj) === '[object Object]' ? {} : [];

            for (let i in obj) {
                if (Object.prototype.toString.apply(obj[i]) === '[object Object]') {
                    output[i.toLowerCase()] = convertKeysToLowerCase(obj[i]);          
                }else if(Object.prototype.toString.apply(obj[i]) === '[object Array]'){
                    output[i.toLowerCase()] = convertKeysToLowerCase(obj[i]);
                } else {
                    output[i.toLowerCase()] = obj[i];
                }
            }

            return output;
        }

        export function convertKeysFromSnakeToCamelCase(obj) {
            const snakeToCamelCase = (key: string) => key.toLowerCase().split("_").map((word, i) => i > 0 ? (word[0].toUpperCase() + word.substring(1)) : word).join("");
            const output = Object.prototype.toString.apply(obj) === '[object Object]' ? {} : [];

            for (let i in obj) {
                if (Object.prototype.toString.apply(obj[i]) === '[object Object]') {
                    output[snakeToCamelCase(i)] = convertKeysFromSnakeToCamelCase(obj[i]);       
                }else if(Object.prototype.toString.apply(obj[i]) === '[object Array]'){
                    output[snakeToCamelCase(i)] = convertKeysFromSnakeToCamelCase(obj[i]);
                } else {
                    output[snakeToCamelCase(i)] = obj[i];
                }
            }

            return output;
        }

        export function convertKeysToUpperCase(obj) {
            const output = Object.prototype.toString.apply(obj) === '[object Object]' ? {} : [];

            for (let i in obj) {
                if (Object.prototype.toString.apply(obj[i]) === '[object Object]') {
                    output[i.toUpperCase()] = convertKeysToUpperCase(obj[i]);
                }else if(Object.prototype.toString.apply(obj[i]) === '[object Array]'){
                    output[i.toUpperCase()] = convertKeysToUpperCase(obj[i]);
                } else {
                    output[i.toUpperCase()] = obj[i];
                }
            }

            return output;
        }

        export function convertKeysFromCamelToSnakeCase(obj) {
            const camelToSnakeCase = (key: string) => key.split(/(?=[A-Z])/).join('_').toLowerCase();
            const output = Object.prototype.toString.apply(obj) === '[object Object]' ? {} : [];

            for (let i in obj) {
                if (Object.prototype.toString.apply(obj[i]) === '[object Object]') {
                    output[camelToSnakeCase(i)] = convertKeysFromCamelToSnakeCase(obj[i]);
                }else if(Object.prototype.toString.apply(obj[i]) === '[object Array]') {
                    output[camelToSnakeCase(i)] = convertKeysFromCamelToSnakeCase(obj[i]);                  
                } else {
                    output[camelToSnakeCase(i)] = obj[i];
                }
            }

            return output;
        }
    }    

    export namespace Service {
        export function setupHandler(handler, args: any) {
            function checkResponseState (data) {
                if (typeof data === "object") {
                    if (Array.isArray(data)) {
                        return data.length > 0 ? true : false;
                    } else if (data.hasOwnProperty("status")) {
                        return data.status.toLowerCase() === "ok";
                    } else if (data.hasOwnProperty("WA_S1")) {
                        return data.WA_S1.IND === "S";
                    } else if (data.hasOwnProperty("RESPONSE_WA")) {
                        return data.RESPONSE_WA.IND === "S";
                    } 
                }

                return false;
            };

            function getResponseMessage(data: any, message?: string): string {
                if (typeof data === "object") {
                    if (Array.isArray(data)) {
                        return ""
                    } else if (data.hasOwnProperty("message")) {
                        return data.message;
                    } else if (data.hasOwnProperty("WA_S1")) {
                        return data.WA_S1.MSG;
                    } else if (data.hasOwnProperty("RESPONSE_WA")) {
                        return data.RESPONSE_WA.MSG;
                    }
                }

                return message;
            }

            return new Promise((resolve) => {
                if (args.hasOwnProperty("parameters") && !args.parameters.hasOwnProperty("sap-client")) {
                    args.parameters["sap-client"] = "100";
                }

                handler(args).always((data: any, textStatus: any) => {
                    if (textStatus.toLowerCase() === "success") {
                        if (data.hasOwnProperty("result")) {
                            resolve({
                                successful: checkResponseState(data.result),
                                message: checkResponseState(data.result) ? "OK" : getResponseMessage(data.result, "Undefined error."),
                                data: Ext.Objects.convertKeysToLowerCase(data.result)
                            });
                        } else {
                            resolve({
                                successful: checkResponseState(data),
                                message: checkResponseState(data) ? "OK" : getResponseMessage(data, "Undefined error."),
                                data: Ext.Objects.convertKeysToLowerCase(data)
                            });
                        }                        
                    } else {
                        if (data.responseJSON.hasOwnProperty("message")) {
                            resolve({
                                successful: false,
                                message: data.responseJSON.message,
                                data: null
                            });
                        } else {
                            resolve({
                                successful: false,
                                message: "API threw an error.",
                                data: data.responseJSON
                            });
                        }                        
                    }
                })
            });
        }
    }
}