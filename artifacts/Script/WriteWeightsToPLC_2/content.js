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
    headers["neptune-user"] = "Unknown";
}

if (!body.hasOwnProperty('scale') ||
    !body.hasOwnProperty('equipmentNumber') ||
    !body.hasOwnProperty('minWeight') ||
    !body.hasOwnProperty('maxWeight')) {
    Response.error("Missing one or more parameters.");
    return complete();
}

if (_.isEmpty(body.scale) || !_.isString(body.scale)) {
    Response.error("Scale cannot be empty.");

    return complete();
}

if (_.isEmpty(body.equipmentNumber) || !_.isString(body.equipmentNumber)) {
    Response.error("Vessel cannot be empty.");

    return complete();
}

if(_.isEmpty(body.minWeight.toString())) {
    Response.error("Minimum weight cannot be empty.");

    return complete();
} else if (!_.isNumber(body.minWeight) || _.toNumber(body.minWeight) <= 0) {
    Response.error("Invalid minimum weight supplied.");

    return complete();
}

if(_.isEmpty(body.maxWeight.toString())) {
    Response.error("Maximum weight cannot be empty.");

    return complete();
} else if (!_.isNumber(body.maxWeight) || _.toNumber(body.maxWeight) <= 0) {
    Response.error("Invalid minimum weight supplied.");
    
    return complete();
}

// Capture Request
await log("Init");

let hostAddress, plcConnection, plcRequestData, sapUpdateData;

try {
    hostAddress = await dbHostPromise({
        barcode: body.scale
    });
    
    await log("Scale located");
} catch(err) {
    await log("Error", {
        "error_keyword": "Locating scale",
        "error_message": err
    });

    Response.error("Failed to locate scale.");

    return complete();
}

try {
    sapUpdateData = await sapUpdatePromise({
        equipment: body.equipmentNumber
    }, headers["neptune-user"]);
    
    await log("Prepped vessel for filling");
} catch(err) {
    await log("Error", {
        "error_keyword": "Prepping vessel for filling",
        "error_message": err 
    });

    Response.error("SAP: " + err);

    return complete();
}

try {
    plcConnection = new nodeS7();

    plcRequestData = await plcRequestPromise({
        host: hostAddress,
        conn: plcConnection,
        equnr: body.equipmentNumber + ",2", // Remember to remove the ",2" when parallel process it done.
        minimum: body.minWeight,
        maximum: body.maxWeight
    });

    await log("Update scale");

    Response.ok(plcRequestData);
    
    return complete();
} catch(err) {
    await log("Error", {
        "error_keyword": "Updating scale",
        "error_message": err
    });

    Response.error("PLC: " + err);

    return complete();
} finally {
    if (typeof(plcConnection) !== "undefined") {
        plcConnection.dropConnection();
    }
}

async function log(message, content) {
    const data = content || {};
    
    await entities.scales_audit.insert({
        "scale": body.scale,
        "equipment": body.equipmentNumber,
        "header": "WriteWeightsToPLC",
        "content": JSON.stringify({
            "request_header": headers,
            "request_body": body,
            ...data
        }),
        "message": message,
        "user": headers["neptune-user"]
    })
}

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

function sapUpdatePromise({ equipment }, user) {
    const promise = new Promise(async (res, rej) => {
        const options = {
            headers: {
                "neptune-user": user
            },
            parameters: {
                "sap-client": "100", 
                "AJAX_VALUE": "X"
            },
            data: {
                "GS_P5": {
                    "EQUNR": equipment
                } 
            }
        };

        try {
            const response = await apis.sap_move_to_filling(options);

            const result = response.data.result;

            if (result.GS_P5.IND !== "S") {
                return rej(new Error(result.GS_P5.MSG));
            }

            return res();
        } catch(err) {
            return rej(err);
        }
    });

    return promise;
}

function plcRequestPromise({ conn, host, equnr, minimum, maximum }) {
    const readAllItems = (conn) => new Promise((r) => conn.readAllItems((err, values) => err ? r({ successful: false, message: err }) : r({ successful: true, values: values })));
    const writeItems = (conn, key, value) => new Promise((res) => conn.writeItems(key, value, (err) => err ? res({ successful: false, message: err }) : res({ successful: true })));

    const promise = new Promise((res, rej) => {
        conn.initiateConnection({ port: 102, host: host, rack: 0, slot: 1, timeout: 5000 }, async () => {
            if (typeof(err) !== "undefined") {
                return rej(new Error("PLC Connect Error: " + err.code));
            } 

            let actionResult;

            conn.setTranslationCB(translationHandler);
                    
            conn.addItems('PLC01_Equnr_to_PLC');
            conn.addItems('PLC01_Ntgew_to_PLC');                   
            conn.addItems('PLC01_ergew_to_PLC');
            conn.addItems('PLC01_Handshake_to_Steltix');

            actionResult = await writeItems(conn, 'PLC01_Equnr_to_PLC', equnr.toUpperCase());

            if (!actionResult.successful) {
                return rej(new Error("PLC Read Error: " + actionResult.message));
            }

            actionResult = await writeItems(conn, 'PLC01_Ntgew_to_PLC', minimum.toString());

            if (!actionResult.successful) {
                return rej(new Error("PLC Read Error: " + actionResult.message));
            }

            actionResult = await writeItems(conn, 'PLC01_ergew_to_PLC', maximum.toString());

            if (!actionResult.successful) {
                return rej(new Error("PLC Read Error: " + actionResult.message));
            }

            actionResult = await writeItems(conn, 'PLC01_Handshake_to_Steltix', 2);

            if (!actionResult.successful) {
                return rej(new Error("PLC Read Error: " + actionResult.message));
            }

            conn.removeItems('PLC01_Equnr_to_PLC');
            conn.removeItems('PLC01_Ntgew_to_PLC');
            conn.removeItems('PLC01_ergew_to_PLC');
            conn.removeItems('PLC01_Handshake_to_Steltix');
            
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
                PLC01_Handshake_From_Steltix:'DB3,INT4',
                PLC01_Equnr_to_PLC:'DB8,S256.40',	
                PLC01_Ntgew_to_PLC: 'DB8,S1024.40',     
                PLC01_ergew_to_PLC: 'DB8,S1280.40',   
                PLC01_Handshake_to_Steltix:'DB3,INT4',
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

