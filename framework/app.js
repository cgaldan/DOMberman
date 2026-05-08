import { patch, render } from "./render.js";

export function createApp({ root, router = null, store = null, view } = {}) {
    if (!root) {
        throw new Error("createApp requires a root element.");
    }

    if (typeof view !== "function") {
        throw new TypeError("createApp requires a view function.");
    }

    let currentVDOM = null;
    let mounted = false;
    let renderQueued = false;
    const unsubscribers = [];

    function getState() {
        return store && typeof store.getState === "function" ? store.getState() : undefined;
    }

    function buildVDOM() {
        return view(getState(), {
            router,
            store,
            route: router && typeof router.getCurrentRoute === "function"
                ? router.getCurrentRoute()
                : undefined,
        });
    }

    function renderNow() {
        if (!mounted) return;

        const nextVDOM = buildVDOM();
        if (currentVDOM) {
            patch(root, currentVDOM, nextVDOM);
        } else {
            render(nextVDOM, root);
        }
        currentVDOM = nextVDOM;
        renderQueued = false;
    }

    function requestRender() {
        if (!mounted || renderQueued) return;

        renderQueued = true;
        queueMicrotask(renderNow);
    }

    return {
        mount() {
            if (mounted) return this;

            mounted = true;
            renderNow();

            if (store && typeof store.subscribe === "function") {
                unsubscribers.push(store.subscribe(requestRender));
            }

            if (router && typeof router.subscribe === "function") {
                unsubscribers.push(router.subscribe(requestRender));
            }

            return this;
        },

        unmount() {
            unsubscribers.splice(0).forEach(unsubscribe => unsubscribe());
            root.innerHTML = "";
            currentVDOM = null;
            mounted = false;
            renderQueued = false;
            return this;
        },

        render: renderNow,

        getCurrentVDOM() {
            return currentVDOM;
        },
    };
}
