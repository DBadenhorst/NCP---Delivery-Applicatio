/////////////////////////////////////////////////////
/// Modules
/////////////////////////////////////////////////////

const _ = modules.lodash;
const nodeS7 = modules.nodeS7

/////////////////////////////////////////////////////
/// Setup Response
/////////////////////////////////////////////////////

const Response = globals.ResponseHandler;

Response.setup(result);

/////////////////////////////////////////////////////
/// Process Request
/////////////////////////////////////////////////////

let headers = req.headers;
let body = req.body;

if (typeof headers === "object" && !headers.hasOwnProperty("neptune-user")) {
    headers["neptune-user"] = "NodeRed";
}

// Capture Request
await entities.scales_audit.insert({
    "scale": body.scale,
    "header": JSON.stringify(headers),
    "content": JSON.stringify(body),
    "message": "PLC Confirmation: Captured",
    "user": headers["neptune-user"]
})

if (typeof body === "object" && !body.hasOwnProperty('scale')) {
    Response.error("Missing one or more parameters.");

    return complete();
}

if (_.isEmpty(body.scale) || !_.isString(body.scale)) {
    Response.error("Scale cannot be empty.");
    
    return complete();
}

let hostAddress, plcConnection, plcRequestData, sapUpdateData;

try {
    hostAddress = await dbHostPromise({
        barcode: body.scale
    });
} catch(err) {
    Response.error("HOST: " + err);

    return complete();
}

try {
    plcConnection = new nodeS7();

    plcRequestData = await plcRequestPromise({
        host: hostAddress,
        conn: plcConnection
    });

    Response.ok(plcRequestData);
} catch(err) {
    Response.error("S7: " + err);

    return complete();
} finally {
    if (typeof(plcConnection) !== "undefined") {
        plcConnection.dropConnection();
    }
}

try {
    let setpoint = parseFloat(plcRequestData.PLC01_Calculated_Weight_SP);
    let initial = parseFloat(plcRequestData.PLC_Initial_Weight);
    let preempty = parseFloat(plcRequestData.PLC01_Weight_SP2) / 1000;
    let nett =  setpoint + preempty - initial;
    let tare = plcRequestData.PLC01_Ntgew_from_PLC;
    let gros = nett + tare;

    sapUpdateData = await sapUpdatePromise({
        equipment: plcRequestData.PLC01_Equnr_from_PLC,
        tare_weight: tare,
        nett_weight: nett,
        gros_weight: gros
    }, headers["neptune-user"]);
} catch(err) {        
    Response.error("SAP: " + err);

    return complete();
}

// Complete Request
await entities.scales_audit.insert({
    "scale": body.scale,
    "equipment": plcRequestData.PLC01_Equnr_from_PLC,
    "header": JSON.stringify(headers),
    "content": JSON.stringify(body),
    "message": "PLC Confirmation: Filled",
    "user": headers["neptune-user"]
})

return complete();

function dbHostPromise({ barcode }) {
    const promise = new Promise(async (res, rej) => {
        const scaleEntity = await entities
            .scales_data
            .createQueryBuilder("alias")
            .where("alias.barcode = :barcode", { barcode: barcode.toUpperCase() })
            .getOne();

        if (!_.isObject(scaleEntity) || _.isEmpty(scaleEntity)) {
            rej(new Error("Scale not found."));
        } else {
            res(scaleEntity.ipaddress);
        }
    });

    return promise;
}

function plcRequestPromise({ conn, host }) {
    const readAllItems = (conn) => new Promise((r) => conn.readAllItems((err, values) => err ? r({ successful: false, message: err }) : r({ successful: true, values: values })));
    const writeItems = (conn, key, value) => new Promise((res) => conn.writeItems(key, value, (err) => err ? res({ successful: false, message: err }) : res({ successful: true })));

    const promise = new Promise((res, rej) => {
        conn.initiateConnection({ port: 102, host: host, rack: 0, slot: 1, timeout: 5000 }, async () => {
            if (typeof(err) !== "undefined") {
                rej(new Error("PLC Connect Error: " + err.code));
            } 
            
            let actionResult;

            conn.setTranslationCB(translationHandler);
            
            conn.addItems('PLC01_Handshake_to_Steltix');
            conn.addItems('PLC01_Equnr_from_PLC');

            actionResult = await writeItems(conn, 'PLC01_Handshake_to_Steltix', 3);
            actionResult = await writeItems(conn, 'PLC01_Equnr_from_PLC', '');

            if (!actionResult.successful) {
                return rej(new Error("PLC Read Error: " + actionResult.message));
            }

            conn.removeItems('PLC01_Handshake_to_Steltix');
            
            conn.addItems('PLC01_Weight_SP2');
            conn.addItems('PLC01_Equnr_from_PLC');
            conn.addItems('PLC01_Ntgew_from_PLC');
            conn.addItems('PLC01_ergew_from_PLC');
            conn.addItems('PLC01_Calculated_Weight_SP');
            conn.addItems('PLC_Initial_Weight');
            conn.addItems('PLC01_Weight_Actual');
            conn.addItems('Ph_Weighing_Message');
            conn.addItems('Ph_Weighing_Status');
            conn.addItems('Ph_Weighing_Step_Index');
            conn.addItems('Ph_Weighing_Hold_Index');
            conn.addItems('Ph_Weighing_Counter_SP');
            conn.addItems('Ph_Weighing_Counter_Act');

            actionResult = await readAllItems(conn);

            if (!actionResult.successful) {
                return rej(new Error("PLC Read Error: " + actionResult.message));
            }

            return res(actionResult.values);
        });

        function translationHandler(tag) {
            const variables = {
                PLC01_Handshake_to_Steltix:'DB3,INT4',
                PLC01_Weight_SP2: 'DB4,REAL4',
                PLC01_Equnr_from_PLC: 'DB9,S256.40',
                PLC01_Ntgew_from_PLC: 'DB9,S1024.40',
                PLC01_ergew_from_PLC: 'DB9,S1280.40',
                PLC01_Calculated_Weight_SP: 'DB3,REAL30',
                PLC_Initial_Weight: 'DB3,REAL14',
                PLC01_Weight_Actual: 'DB11,REAL52',
                Ph_Weighing_Message: 'DB2,WORD18',
                Ph_Weighing_Status: 'DB2,WORD16',
                Ph_Weighing_Step_Index: 'DB2,WORD10',
                Ph_Weighing_Hold_Index: 'DB2,WORD12',
                Ph_Weighing_Counter_SP: 'DB2,REAL20',
                Ph_Weighing_Counter_Act: 'DB2,REAL24',
            };

            return variables[tag];
        }
    });

    return promise;
}

function sapUpdatePromise({ equipment, tare_weight, nett_weight, gros_weight }, user) {
    const promise = new Promise(async (res, rej) => {
        try {
            const response = await apis.sap_confirm_filling({
                headers: {
                    "neptune-user": user
                },
                parameters: {
                    "sap-client": "100", 
                    "AJAX_VALUE": "X"
                },
                data: {
                    "GS_P5": {
                        "EQUNR": equipment,
                        "BRGEW": gros_weight,
                        "NTGEW": nett_weight,
                        "ERGEW": tare_weight
                    } 
                }
            });

            const result = response.data.result;

            if (result.GS_P5.IND !== "S") {
                return rej(new Error(result.GS_P5.MSG));
            }
        } catch(err) {
            return rej(err);
        }

        return res();
    });

    return promise;
}