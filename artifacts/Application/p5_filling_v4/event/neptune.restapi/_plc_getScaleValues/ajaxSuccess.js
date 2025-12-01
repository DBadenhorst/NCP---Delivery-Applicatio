/// Get Data

const response = xhr.responseJSON;
const scaleMessageIndex = response.data.Ph_Weighing_Message || 0
const scaleStepIndex = response.data.Ph_Weighing_Step_Index || 0

/// Scale Name

oScale_InputGroup.setVisible(false)
oScale_DisplayGroup.setVisible(true)
oScale_Display.setValue(Data.scale)

/// Scale Message

const possibleMessageList = {
    "0": "None",
    "200": "Remove vessel from scale; checking for weight < 0.5 Kg",
    "202": "Waiting for weight > 10 Kg; place vessel on scale",
    "205": "Scan load cell and Vessel",
    "210": "Connect Vessel\nWhen ready press fill button",
    "220": "Please wait\nFilling to weight setpoint",
    "230": "Please wait\nWaiting for scanner confirmation to remove vessel",
    "231": "Filling done\nRemove vessel and when done press ACK button",
    "2000": "Please wait\nZeroing scale",
    "2005": "Vessel has expired\nPress ACK button",
    "10": "Idle status\nPress Start button",
    "1299": "Held status\nPress Restart button",
}

const scaleMessageText = possibleMessageList[scaleMessageIndex.toString()]

oScale_MessageDisplay.setVisible(true)
oScaleMessage_Text.setText(scaleMessageText)

/// Scale Vessel

if (scaleStepIndex === 210) {
    Data.waiting = false;
}

if (typeof Data.waiting === "undefined" || !Data.waiting) {
    oVessel_InputGroup.setVisible(false)
    oScale_DataDisplay.setVisible(false)
    oScaleConfirm_Button.setVisible(false)
    oScaleComplete_Button.setVisible(false)

    if (scaleMessageIndex === 205 && scaleStepIndex === 205) {
        oVessel_InputGroup.setVisible(true) 
        oScaleConfirm_Button.setVisible(true)
    } 
}

if (scaleStepIndex >= 210 && scaleStepIndex <= 230) {
    oVessel_Input.setValue("");
    
    Data.vessel = ""

    oScale_DataDisplay.setVisible(true)

    oScaleData_List.getModel().setData([
        { "key": "Equipment:", "value": response.data.PLC01_Equnr_from_PLC },
        { "key": "Minimum Weight:", "value": parseFloat(response.data.PLC01_Ntgew_from_PLC).toFixed(3) + " kg" },
        { "key": "Maximum Weight:", "value": parseFloat(response.data.PLC01_ergew_from_PLC).toFixed(3) + " kg" },
        { "key": "Initial Weight:", "value": response.data.PLC_Initial_Weight.toFixed(3) + " kg" },
        { "key": "Set Point Weight:", "value": response.data.PLC01_Calculated_Weight_SP.toFixed(3) + " kg" },
        { "key": "Actual Weight:", "value": response.data.PLC01_Weight_Actual.toFixed(3) + " kg" },
    ]);

    if (scaleMessageIndex === 230) {
        oScaleComplete_Button.setVisible(true)
    } 
}

