class EventManager {
    constructor() {
        this.listeners = new Map();
        this.elementCount = 0;
        this.rootElement = null;
        this.delegatedEvents = new Set();
    }

    init(root) {
        if (!root) {
            throw new Error("EventManager requires a root element.");
        }

        if (this.rootElement === root) {
            return;
        }

        this.rootElement = root;
        this.setupDelegation();
    }

    setupDelegation() {
        const eventTypes = ['click', 'input', 'change', 'submit', 'keydown', 'keyup', 'keypress', 'focus', 'focusout', 'dblclick'];
    
        eventTypes.forEach(type => {
            this.rootElement.addEventListener(type, (event) => this.handleEvent(event), true);
            this.delegatedEvents.add(type);
        });
    }

    handleEvent(event) {
        let target = event.target;

        while (target && target !== this.rootElement.parentElement) {
            const elementId = target.__eventId;

            if (elementId && this.listeners.has(elementId)) {
                const handlers = this.listeners.get(elementId);
                const handler = handlers.get(event.type);

                if (handler) {
                    handler(event);
                    
                    if (event.cancelBubble) {
                        break;
                    }
                }
            }

            target = target.parentElement;
        }
    }

    on(element, type, handler) {
        if (!element.__eventId) {
            element.__eventId = `el_${this.elementCount++}`;
        }

        const elementId = element.__eventId;

        if (!this.listeners.has(elementId)) {
            this.listeners.set(elementId, new Map());
        }

        this.listeners.get(elementId).set(type, handler);
    }

    off(element, type) {
        const elementId = element.__eventId;

        if (elementId && this.listeners.has(elementId)) {
            if (typeof type === "undefined") {
                this.listeners.delete(elementId);
                return;
            }

            this.listeners.get(elementId).delete(type);

            if (this.listeners.get(elementId).size === 0) {
                this.listeners.delete(elementId);
            }
        }
    }
}

export const eventManager = new EventManager();

export function on(element, type, handler) {
    eventManager.on(element, type, handler);
}

export function off(element, type) {
    eventManager.off(element, type);
}
