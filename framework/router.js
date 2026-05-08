export class Router {
    constructor(routes = {}, store = null) {
        if (!routes || typeof routes !== "object") {
            throw new TypeError("Router requires a routes object.");
        }

        this.routes = routes;
        this.store = store;
        this.currentRoute = null;
        this.listeners = new Set();

        if (typeof window !== "undefined") {
            this.init();
        }
    }

    init() {
        window.onhashchange = () => this.handleRouteChange();

        this.handleRouteChange();
    }

    handleRouteChange() {
        const hash = window.location.hash.slice(1) || '/';
        const route = this.matchRoute(hash);

        if (!route) {
            throw new Error(`Route not found: ${hash}`);
        }
        
        this.currentRoute = route;

        if (this.store) {
            this.store.dispatch({
                type: 'ROUTE_CHANGE',
                payload: { route: route.path, params: route.params }
            });
        }
        
        if (route.handler) {
            route.handler(route.params);
        }

        this.notify(route);
    }

    matchRoute(hash) {
        if (this.routes[hash]) {
            return {
                path: hash,
                params: {},
                handler: this.routes[hash]
            };
        }

        for (const [pattern, handler] of Object.entries(this.routes)) {
            const params = this.matchPattern(pattern, hash);
            if (params) {
                return {
                    path: hash,
                    pattern,
                    handler,
                    params
                };
            }
        }

        if (this.routes['*']) {
            return {
                path: hash,
                handler: this.routes['*'],
                params: {}
            };
        }

        return null;
    }
    
    matchPattern(pattern, path) {
        const patternParts = pattern.split('/');
        const pathParts = path.split('/');

        if (patternParts.length !== pathParts.length) {
            return null;
        }

        const params = {};

        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
                const paramName = patternParts[i].slice(1);
                params[paramName] = pathParts[i];
            } else if (patternParts[i] !== pathParts[i]) {
                return null;
            }
        }

        return params;
    }
    
    navigate(path) {
        if (typeof path !== "string" || !path.startsWith("/")) {
            throw new TypeError('router.navigate(path) requires a path string starting with "/".');
        }

        window.location.hash = path;
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify(route) {
        this.listeners.forEach(listener => listener(route));
    }

    getCurrentRoute() {
        return window.location.hash.slice(1) || '/';
    }

    register(path, handler) {
        this.routes[path] = handler;
    }
}

export function createRouter(routes, store) {
    return new Router(routes, store);
}