const props = {};

function setup(result) {
    props.result = result;
};

function ok(content = undefined) {
    if (typeof content !== "object") {
        props.result.statusCode = 200;
        props.result.data =  {
            statusCode: 200,
            status: "Ok"
        };
    } else {
        props.result.statusCode = 200;
        props.result.data =  {
            statusCode: 200,
            status: "Ok",
            data: content
        };
    }
}

function error(message = undefined) {
    if (typeof message !== "string") {
        props.result.statusCode = 400;
        props.result.data =  {
            statusCode: 400,
            status: "Error"
        };
    } else {
        props.result.statusCode = 400;
        props.result.data =  {
            statusCode: 400,
            status: "Error",
            message: message
        };
    }
}

complete({
    setup,
    ok,
    error
});