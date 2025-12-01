/////////////////////////////////////////////////////
/// Modules
/////////////////////////////////////////////////////

const _ = modules.lodash;

/////////////////////////////////////////////////////
/// Setup Services
/////////////////////////////////////////////////////

const Service = { AuditTrail: globals.AuditTrailService };

/////////////////////////////////////////////////////
/// Run Background Job
/////////////////////////////////////////////////////

const entryList = await Service.AuditTrail.retrievePendingEntries();

if (entryList.length > 0) {
    for(let entryItem of entryList) {
        try {
            await sapUpdatePromise({
                equipment: entryItem.equipment_number,
                minimum: entryItem.minimum_weight,
                maximum: entryItem.maximum_weight,
                setpoint: entryItem.setpoint_weight,
                gross: entryItem.gross_weight
            }, entryItem.user);

            await Service.AuditTrail.complete(
                entryItem.scale_name, 
                entryItem.equipment_number);
        } catch(err) {
            await Service.AuditTrail.captureError(
                entryItem.scale_name, 
                entryItem.equipment_number, 
                err);
                
            // Email Error if 3 or more attempts       
        }
    }
}

complete();

function sapUpdatePromise({ equipment, minimum, maximum, setpoint, gross }, user) {
    const promise = new Promise(async (res, rej) => {
        try {
            const response = await apis.sap_confirm_filling({
                headers: {
                    "neptune-user": user
                },
                parameters: {
                    "sap-client": "100", 
                    "AJAX_VALUE": setpoint
                },
                data: {
                    "WA_S1": {
                        "EQUNR": equipment,
                        "BRGEW": gross,
                        "NTGEW": minimum,
                        "ERGEW": maximum
                    } 
                }
            });

            const result = response.data.result;

            if (result.WA_S1.IND !== "S") {
                return rej(new Error(result.WA_S1.MSG));
            }
        } catch(err) {
            return rej(err);
        }

        return res();
    });

    return promise;
}