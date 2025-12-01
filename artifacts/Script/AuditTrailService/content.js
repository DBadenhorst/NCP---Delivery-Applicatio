function retrievePendingEntries() {
    const promise = new Promise(async resolve => {
        const { LessThanOrEqual } = operators;

        const entityList = await entities.scales_audit.find({
            "status": "confirming",
            "attempts": LessThanOrEqual(3)
        });

        resolve(entityList);
    });

    return promise;
}

function create(scale, equipment, user) {
    const promise = new Promise(async resolve => {
        let entityItem = entities.scales_audit.create({
            "scale_name": scale.toUpperCase(),
            "equipment_number": equipment.toUpperCase(),
            "message": "Busy filling the vessel",
            "status": "filling",
            "attempts": "1",
            "user": user
        });

        await entities.scales_audit.save(entityItem);

        return resolve();
    });

    return promise;
}

function confirmWeights(scale, equipment, minimum, maximum, setpoint, gross) {
    const promise = new Promise(async resolve => {
        const entityItem = await entities.scales_audit.findOne({ 
            "scale_name": scale.toUpperCase(),
            "equipment_number": equipment.toUpperCase(),
            "status": "filling"
        });

        entityItem.minimum_weight = minimum;
        entityItem.maximum_weight = maximum;
        entityItem.setpoint_weight = setpoint;
        entityItem.gross_weight = gross;
        entityItem.message = "Done filling the vessel";
        entityItem.status = "confirming";


        await entities.scales_audit.save(entityItem);

        return resolve();
    });

    return promise;
}

function captureError(scale, equipment, message) {
    const promise = new Promise(async resolve => {
        const entityItem = await entities.scales_audit.findOne({ 
            "scale_name": scale.toUpperCase(),
            "equipment_number": equipment.toUpperCase(),
            "status": "confirming"
        });

        entityItem.message = message;
        entityItem.attempts += 1;
        entityItem.status = entityItem.attempts < 3 ? "confirming" : "failed";

        await entities.scales_audit.save(entityItem);

        return resolve();
    });

    return promise;
}

function finish(scale, equipment) {
    const promise = new Promise(async resolve => {
        const entityItem = await entities.scales_audit.findOne({ 
            "scale_name": scale.toUpperCase(),
            "equipment_number": equipment.toUpperCase(),
            "status": "confirming"
        });

        entityItem.message = "Done confirming the filling of the vessel";
        entityItem.status = "complete";


        await entities.scales_audit.save(entityItem);

        return resolve();
    });

    return promise;
}

complete({
    retrievePendingEntries,
    create,
    confirmWeights,
    captureError,
    complete
});