/**
 * Use this namespace to reference objects in your custom component.
 * 
 * When using custom components you might have multiple instances of the
 * same custom component. When you add a custom component to an app this
 * namespace is renamed to the custom component object name in the app.
 * 
 * E.g. if the custom component object name is myCustomComponent you can call
 * functions from this namespace with myCustomComponent.foo()
 *
 */
namespace CustomComponent {

    export function setValue(value: string) {
        value = value.trim();        

        input.setValue(value);
    }

    export function getValue(): string {
        let value: string = input.getValue().trim();

        return value;
    }

    export function setError(message?: string) {
        if (typeof message !== undefined) {
            input
                .setValueState(sap.ui.core.ValueState.Error)
                .setValueStateText(message);
        } else {
            input
                .setValueState(sap.ui.core.ValueState.Error)
                .setValueStateText("");
        }        
    }

    export function clearError() {
        input
            .setValueState()
            .setValueStateText("");
    }

    export function setFocus() {
        setTimeout(() => { input.focus() }, 300);
    }

    export function setVisible(state?: boolean) {
        if (typeof state !== undefined) {
            container.setVisible(state);
        } else {
            container.setVisible(true);
        }
    }
    
}