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
 
const headers = req.headers;
const body = req.body;

if (!_.has(body, 'scale') || _.isEmpty(body.scale)) {
    return Response.error("Missing one or more parameters.");
}

let hostAddress, plcConnection, plcRequestData;

try {
    hostAddress = await dbHostPromise({
        barcode: body.scale
    });
} catch(err) {
    Response.error("Host: " + err);

    return complete();
}

try {
    plcConnection = new nodeS7();

    plcRequestData = await plcRequestPromise({
        host: hostAddress,
        conn: plcConnection
    });

    Response.ok(plcRequestData);

    return complete();
} catch(err) {
    Response.error("S7: " + err);

    return complete();
} finally {
    if (typeof(plcConnection) !== "undefined") {
        plcConnection.dropConnection();
    }
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

function plcRequestPromise({ conn, host }) {
    const promise = new Promise((res, rej) => {
        conn.initiateConnection({ port: 102, host: host, rack: 0, slot: 1, timeout: 5000 }, () => {
            if (typeof(err) !== "undefined") {
                rej(new Error("PLC Connect Error: " + err.code));
            } else {
                conn.setTranslationCB(translationHandler);
                    
                conn.addItems('PLC01_Weight_SP1');
                conn.addItems('PLC01_Weight_SP2');
                conn.addItems('PLC01_Weight_Actual');
                conn.addItems('PLC01_Calculated_Weight_SP');
                conn.addItems('PLC_Initial_Weight');
                conn.addItems('PLC01_Filled_Weight_from_PLC');
                conn.addItems('PLC01_Equnr_from_PLC');
                conn.addItems('PLC01_Ntgew_from_PLC');
                conn.addItems('PLC01_ergew_from_PLC');
                conn.addItems('PLC01_HandShake_From_PLC');
                conn.addItems('Ph_Weighing_Message');
                conn.addItems('Ph_Weighing_Status');
                conn.addItems('Ph_Weighing_Step_Index');
                conn.addItems('Ph_Weighing_Hold_Index');
                conn.addItems('Ph_Weighing_Counter_SP');
                conn.addItems('Ph_Weighing_Counter_Act');

                conn.readAllItems((err, values) => {
                    if (err) {
                        rej(new Error("PLC Read Error: " + err));
                    } else {
                        res(values);
                    }
                });
            }
        });

        function translationHandler(tag) {
            const variables = {
                PLC01_Weight_SP1:               'DB4,REAL0',
                PLC01_Weight_SP2:               'DB4,REAL4',
                PLC01_Weight_Actual:            'DB11,REAL52',
                PLC01_Calculated_Weight_SP:     'DB3,REAL30',
                PLC_Initial_Weight:             'DB3,REAL14',
                PLC01_Filled_Weight_from_PLC:   'DB9,REAL2304',
                PLC01_Equnr_from_PLC:           'DB9,S256.40',
                PLC01_Ntgew_from_PLC:           'DB9,S1024.40',
                PLC01_ergew_from_PLC:           'DB9,S1280.40',
                PLC01_HandShake_From_PLC:       'DB3,INT2',                
                Ph_Weighing_Message:            'DB2,WORD18',
                Ph_Weighing_Status:             'DB2,WORD16',
                Ph_Weighing_Step_Index:         'DB2,WORD10',
                Ph_Weighing_Hold_Index:         'DB2,WORD12',
                Ph_Weighing_Counter_SP:         'DB2,REAL20',
                Ph_Weighing_Counter_Act:        'DB2,REAL24',
            };

            return variables[tag];
        }
    });

    return promise;
}