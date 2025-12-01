namespace Validator {

    export enum CheckType { 
        "Required",
        "Integer",
        "Number",
        "Boolean",
        "AlphaString",
        "NumericString",
        "AlphaNumericString"
    }

    let inputErrorCount = 0;

    export function validate(validators: any[]) {
        let firstError: boolean = false;

        inputErrorCount = 0;

        if (validators.length === 0) return;

        for (let validator of validators) {
            if (validator[1].length === 0) continue;

            let input: any = validator[0];
            let value: string = input.getValue().trim();

            for (let check of validator[1]) {
                if (check === CheckType.Required) {
                    if (!value.replace(/\s/g, "")) {
                        inputErrorCount++;

                        input.setError("Field cannot be empty!");

                        if(!firstError) {
                            input.setFocus();
                            
                            firstError = !firstError;
                        }

                        break;
                    } 

                    input.clearError();
                }

                if (check === CheckType.Integer) {
                    if(isNaN(Number(value))) {
                        inputErrorCount++;

                        input.setError("Invalid number entered!");

                        if(!firstError) {
                            input.setFocus();
                            
                            firstError = !firstError;
                        }

                        break;
                    }

                    if (!Number.isInteger(value)) {
                        inputErrorCount++;

                        input.setError("Decimal numbers are not supported!");

                        if(!firstError) {
                            input.setFocus();
                            
                            firstError = !firstError;
                        }

                        break;
                    } 

                    input.clearError();
                }

                if (check === CheckType.Number) {
                    if(isNaN(Number(value))) {
                        inputErrorCount++;

                        input.setError("Invalid number entered!");

                        if(!firstError) {
                            input.setFocus();
                            
                            firstError = !firstError;
                        }

                        break;
                    }
                    
                    input.clearError();
                }

                if (check === CheckType.AlphaString) {
                    if(!/^[a-zA-Z]+$/.test(value)) {
                        inputErrorCount++;

                        input.setError("Only alphabetic characters allowed!");

                        if(!firstError) {
                            input.setFocus();
                            
                            firstError = !firstError;
                        }

                        break;
                    }
                }

                if (check === CheckType.NumericString) {
                    if (!/^\d+$/.test(value)) {
                        inputErrorCount++;

                        input.setError("Only numeric characters allowed!");

                        if(!firstError) {
                            input.setFocus();
                            
                            firstError = !firstError;
                        }

                        break;
                    }
                }

                if (check === CheckType.AlphaNumericString) {
                    if (!/^[A-Za-z0-9]*$/.test(value)) {
                        inputErrorCount++;

                        input.setError("Only alphanumeric characters allowed!");

                        if(!firstError) {
                            input.setFocus();
                            
                            firstError = !firstError;
                        }

                        break;
                    }
                }
            }
        }
    }
    
    export function hasErrors() {
        let result: boolean = inputErrorCount > 0;

        return result;
    }
    
}

