window.PageHandler.Index = (() => {
    const handleInit = async () => {
        oApp.to(oIndex_Page)
        
        PageHandler.PageIndex = 'index'
    }

    const handleNavButton = () => {
        if (sap.n) {
            sap.n.Shell.closeTile(sap.n.Launchpad.currentTile)
        } else {
            alert('Exit out of application')
        }
    }

    const handleScaleSubmitButton = async () => {    
        Validator.validate([
            [ oScale_Input, [ Validator.CheckType.Required ] ]
        ])

        if (Validator.hasErrors()) {
            return
        }

        Data.scale = (oScale_Input.getValue() || "").toUpperCase()

        oScaleSubmit_Button.setBusy(true)

        handle(Data.scale)

        async function handle(scale, maxRetries = 3, retries = 0) {
            const getValuesResult = await ModelHandler.Plc.getValues({ data: { "scale": scale } })

            if (getValuesResult.successful) {
                oScaleSubmit_Button.setBusy(false)
            } else {
                if (retries < (maxRetries - 1)) {
                    setTimeout(() => handle(scale, maxRetries, retries = ++retries), 3000)
                } else {
                    oScaleSubmit_Button.setBusy(false)
                    sap.m.MessageBox.warning("Failed to process request.")
                }
            }
        }
    }

    const handleScaleResetButton = () => {
        oScale_InputGroup.setVisible(true)
        oScale_DisplayGroup.setVisible(false)
        oScale_MessageDisplay.setVisible(false)
        oVessel_InputGroup.setVisible(false)
        oScale_DataDisplay.setVisible(false)

        oScale_Input.setValue("")
        oVessel_Input.setValue("")

        Data.scale = ""
        Data.vessel = ""
    }

    const handleScaleRefreshButton = async () => {
        oScaleRefresh_Button.setBusy(true)

        handle(Data.scale)

        async function handle(scale, maxRetries = 3, retries = 0) {
            const getValuesResult = await ModelHandler.Plc.getValues({ data: { "scale": scale } })

            if (getValuesResult.successful) {
                oScaleRefresh_Button.setBusy(false)
            } else {
                if (retries < (maxRetries - 1)) {
                    setTimeout(() => handle(scale, maxRetries, retries = ++retries), 3000)
                } else {
                    oScaleRefresh_Button.setBusy(false)
                    sap.m.MessageBox.warning("Failed to process request.")
                }
            }
        }
    }

    const handleVesselSubmitButton = async () => {
        Validator.validate([
            [ oVessel_Input, [ Validator.CheckType.Required ] ]
        ])

        if (Validator.hasErrors()) {
            return
        }

        Data.vessel = (oVessel_Input.getValue() || "").toUpperCase()

        oVesselSubmit_Button.setBusy(true)
        
        handle(Data.scale, Data.vessel)

        async function handle(scale, vessel, maxRetries = 1, retries = 0) {
            const getVesselResult = await ModelHandler.Sap.getVessel({
                parameters: {
                    "AJAX_VALUE": vessel.indexOf("/") > -1 ? vessel : "," + vessel
                }
            })

            if (getVesselResult.successful) {
                oVesselSubmit_Button.setBusy(false)

                Data.scaleWeights = {
                    "scale": Data.scale,
                    "equipmentNumber": getVesselResult.data.wa_s1.equnr,
                    "minWeight": getVesselResult.data.wa_s1.ntgew,
                    "maxWeight": getVesselResult.data.wa_s1.ergew
                }

                oVessel_InputGroup.setVisible(false)
                oScale_DataDisplay.setVisible(true)

                oScaleData_List.getModel().setData([
                    { "key": "Equipment:", "value": getVesselResult.data.wa_s1.equnr },
                    { "key": "Minimum Weight:", "value": parseFloat(getVesselResult.data.wa_s1.ntgew).toFixed(3) + " kg" },
                    { "key": "Maximum Weight:", "value": parseFloat(getVesselResult.data.wa_s1.ergew).toFixed(3) + " kg" }
                ]);
            } else {
                if (retries < (maxRetries - 1)) {
                    setTimeout(() => handle(scale, vessel, maxRetries, retries = ++retries), 3000)
                } else {
                    oVesselSubmit_Button.setBusy(false)

                    sap.m.MessageBox.warning(getVesselResult.message, {
                        onClose: function() {
                            oVessel_Input.setValue("")

                            setTimeout(() => {
                                oVessel_Input.setFocus()
                            }, 300)
                        }
                    })
                }
            }
        }
    }

    const handlePushWeightsButton = async () => {
        oScaleConfirm_Button.setBusy(true)

        handle(Data.scaleWeights)

        async function handle(weights, maxRetries = 3, retries = 0) {
            const postWeightsResult = await ModelHandler.Plc.postWeights({ data: weights })

            if (postWeightsResult.successful) {
                Data.waiting = true
                
                handle2(weights.scale)
            } else {
                if (retries < (maxRetries - 1)) {
                    setTimeout(() => handle(weights, maxRetries, ++retries), 3000)
                } else {
                    oScaleConfirm_Button.setBusy(false)

                    sap.m.MessageBox.warning(postWeightsResult.message, {
                        onClose: function() {
                            oVessel_Input.setValue("")

                            setTimeout(() => {
                                oVessel_Input.setFocus()
                            }, 300)
                        }
                    })
                }
            }
        }

        async function handle2(scale, maxRetries = 3, retries = 0) {
            const getValuesResult = await ModelHandler.Plc.getValues({ data: { "scale": scale } })

            if (getValuesResult.successful) {
                if (typeof Data.waiting === "undefined" || !Data.waiting) {
                    oScaleConfirm_Button.setBusy(false)
                } else {
                    if (retries < (20 - 1)) {
                        setTimeout(() => handle2(scale, maxRetries, ++retries), 3000)
                    } else {
                        oScaleConfirm_Button.setBusy(false)
                        sap.m.MessageBox.warning("Failed to process request.")
                    }
                }                
            } else {
                if (retries < (maxRetries - 1)) {
                    setTimeout(() => handle(scale, maxRetries, retries = ++retries), 3000)
                } else {
                    oScaleConfirm_Button.setBusy(false)
                    sap.m.MessageBox.warning("Failed to process request.")
                }
            }
        }
    }

    const handlePushConfirmationButton = async () => {
        oScaleComplete_Button.setBusy(true)

        const postConfirmationResult = await ModelHandler.Plc.postConfirmation({
            data: {
                "scale": Data.scale
            }
        })

        if (!postConfirmationResult.successful) {
            sap.m.MessageBox.warning(postConfirmationResult.message)

            oScaleComplete_Button.setBusy(false)

            return
        }

        await ModelHandler.Plc.getValues({
            data: {
                "scale":  Data.scale
            }
        })
        
        oScaleComplete_Button.setBusy(false)
    }

    return {
        handleInit,
        handleNavButton,
        handleScaleSubmitButton,
        handleScaleResetButton,
        handleScaleRefreshButton,
        handleVesselSubmitButton,
        handlePushWeightsButton,
        handlePushConfirmationButton
    }
})()





