export class VDOM {
    constructor(tag, attrs = {}, children = []) {
        this.tag = tag;
        this.attrs = attrs;
        this.children = children;
    }
}

export function createVDOM(tag, attrs = {}, ...children) {
    const flattenedChildren = fragment(children);

    return new VDOM(tag, attrs, flattenedChildren);
}

export function fragment(children) {
    return children
    .flat(Infinity)
    .filter(child => child !== null && child !== undefined && child !== false);
}