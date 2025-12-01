window.ModelHandler = {
    Sap: {
        getVessel: (args) => Ext.Service.setupHandler(api_sap_getVessel, args)
    },
    Plc: {
        getValues: (args) => Ext.Service.setupHandler(api_plc_getScaleValues, args),
        postWeights: (args) => Ext.Service.setupHandler(api_plc_postWeights, args),
        postConfirmation: (args) => Ext.Service.setupHandler(api_plc_postConfirmation, args)
    }
};