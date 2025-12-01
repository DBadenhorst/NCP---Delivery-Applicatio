window.ApplicationHandler = (() => {
    const setBusy = () => {
        oApp.setBusy(true)
    }

    const unsetBusy = () => {
        oApp.setBusy(false)
    }

    const navigateTo = (route) => {
        switch (route.toLowerCase()) {
            case "index":
                PageHandler.Index.handleInit()
                break
            default:
                PageHandler.Index.handleInit()
                break
        }
    }

    return {
        setBusy,
        unsetBusy,
        navigateTo
    }
})()