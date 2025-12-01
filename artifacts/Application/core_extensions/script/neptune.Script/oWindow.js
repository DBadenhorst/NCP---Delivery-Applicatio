Object.defineProperty(String.prototype, "removeBlanks", {
    value: function removeBlankSpace() {
		return this.replace(/\s/g, '');
    },
    writable: true,
    configurable: true,
});

Object.defineProperty(String.prototype, "isEmpty", {
    value: function isEmpty() {
		return this === null || this.replace(/\s/g, '') === "";
    },
    writable: true,
    configurable: true,
});

Object.defineProperty(Object.prototype, "isEmpty", {
    value: function isEmpty(obj) {
        return typeof(obj) !== "object" || Object.keys(obj).length === 0;
    },
    writable: true,
    configurable: true,
});

Object.defineProperty(Array.prototype, "isEmpty", {
    value: function isEmpty(obj) {
        return !Array.isArray(obj) || obj.length === 0;
    },
    writable: true,
    configurable: true,
});

Object.defineProperty(String.prototype, "isNumeric", {
    value: function isNumeric() {
		if (typeof this != "string") return false; 
        return !isNaN(this) && !isNaN(parseFloat(this));
    },
    writable: true,
    configurable: true,
});

Object.defineProperty(String.prototype, "isAlphaString", {
    value: function isAlphaString() {
		if (typeof this != "string") return false; 
        return /^[a-zA-Z]+$/.test(this);
    },
    writable: true,
    configurable: true,
});

Object.defineProperty(String.prototype, "isNumericString", {
    value: function isNumericString() {
		if (typeof this != "string") return false; 
        return /^\d+$/.test(this);
    },
    writable: true,
    configurable: true,
});

Object.defineProperty(String.prototype, "isAlphaNumericString", {
    value: function isAlphaNumericString() {
		if (typeof this != "string") return false; 
        return /^[a-zA-Z0-9]+$/.test(this);
    },
    writable: true,
    configurable: true,
});

Object.defineProperty(String.prototype, "toInteger", {
    value: function toInteger() {
        if (typeof this != "string") return 0; 
		if (!isNaN(Number(this))) {
            return parseInt(this);
        }
		return 0;
    },
    writable: true,
    configurable: true,
});

Object.defineProperty(String.prototype, "toFloat", {
    value: function toFloat() {
        if (typeof this != "string") return 0; 
		if (!isNaN(Number(this))) {
            return parseFloat(this);
        }
		return 0;
    },
    writable: true,
    configurable: true,
});

Object.defineProperty(String.prototype, "toTitleCase", {
    value: function toTitleCase() {
        let str = this.toLowerCase().split(' ');
		for (var i = 0; i < str.length; i++) {
			str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1); 
		}
		return str.join(' ');
    },
    writable: true,
    configurable: true,
});

Object.defineProperty(Object.prototype, "hasStatusOk", {
    value: function successful() {
        if (Array.isArray(this)) {
            return this.length > 0 ? true : false;
		} else if (this.hasOwnProperty("status")) {
			return this.status.toLowerCase() === "ok";
        } else if (this.hasOwnProperty("RESPONSE_WA")) {
            return this.RESPONSE_WA.IND === "S";
        } else {
            return false;
        }
    },
    writable: true,
    configurable: true,
});

Object.defineProperty(Object.prototype, "hasStatusError", {
    value: function successful() {
        if (Array.isArray(this)) {
            return this.length === 0 ? true : false;
        } else if (this.hasOwnProperty("RESPONSE_WA")) {
            return this.RESPONSE_WA.IND === "E";
        } else {
            return false;
        }
    },
    writable: true,
    configurable: true,
});