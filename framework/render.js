import { VDOM } from "./vdom.js";
import { eventManager } from "./events.js";

export function createElement(VDOM) {
    assertValidVNode(VDOM);

    if (typeof VDOM === "string" || typeof VDOM === "number") {
        return document.createTextNode(String(VDOM));
    }

    const element = document.createElement(VDOM.tag);
    
    Object.entries(VDOM.attrs || {}).forEach(([key, value]) => {
        setAttribute(element, key, value);
    });

    (VDOM.children || []).forEach(child => {
        element.appendChild(createElement(child));
    });

    return element;
}

export function patch(parent, oldVDOM, newVDOM, index = 0) {
    if (!parent) {
      throw new Error("patch requires a parent DOM element.");
    }

    if (oldVDOM === newVDOM) {
      return;
    }

    if (!oldVDOM) {
      parent.appendChild(createElement(newVDOM));
      return;
    }
  
    const element = parent.childNodes[index];
  
    if (!newVDOM) {
      if (element) {
        eventManager.off(element);
        parent.removeChild(element);
      }
      return;
    }
  
    if (typeof oldVDOM === 'string' && typeof newVDOM === 'string') {
      if (oldVDOM !== newVDOM) {
        element.textContent = newVDOM;
      }
      return;
    }
  
    if (
      typeof oldVDOM !== typeof newVDOM ||
      (oldVDOM instanceof VDOM && newVDOM instanceof VDOM && oldVDOM.tag !== newVDOM.tag)
    ) {
      eventManager.off(element);
      parent.replaceChild(createElement(newVDOM), element);
      return;
    }
  
    if (newVDOM instanceof VDOM) {
      updateAttribute(element, oldVDOM.attrs, newVDOM.attrs);
  
      const oldChildren = oldVDOM.children || [];
      const newChildren = newVDOM.children || [];
      const commonLength = Math.min(oldChildren.length, newChildren.length);
  
      for (let i = 0; i < commonLength; i++) {
        patch(element, oldChildren[i], newChildren[i], i);
      }

      for (let i = commonLength; i < newChildren.length; i++) {
        patch(element, null, newChildren[i], i);
      }

      for (let i = oldChildren.length - 1; i >= newChildren.length; i--) {
        patch(element, oldChildren[i], null, i);
      }
    }
}

export function render(VDOM, container) {
    if (!container) {
        throw new Error("render requires a container DOM element.");
    }

    container.innerHTML = '';
    container.appendChild(createElement(VDOM));

    if (!eventManager.rootElement) {
        eventManager.init(container);
    }
}

export function assertValidVNode(vnode) {
    const isTextNode = typeof vnode === "string" || typeof vnode === "number";
    const isElementNode = vnode instanceof VDOM && typeof vnode.tag === "string" && vnode.tag.length > 0;

    if (!isTextNode && !isElementNode) {
        throw new TypeError("Invalid virtual node. Use createVDOM(tag, attrs, ...children) or a text value.");
    }
}

function setAttribute(element, key, value) {
    if (key.startsWith("on") && typeof value === "function") {
        const eventType = key.substring(2).toLowerCase();
        eventManager.on(element, eventType, value);
        return;
    }
    
    if (key === "className") {
        element.className = value;
        return;
    }

    if (key === "style" && typeof value === "object") {
        Object.assign(element.style, value);
        return;
    }

    if (key === "value") {
        element.value = value;
        return;
    }

    if (key === "checked") {
        element.checked = value;
        return;
    }

    if (value === true) {
        element.setAttribute(key, "");
    } else if (value === false || value === null || value === undefined) {
        element.removeAttribute(key);
    } else {
        element.setAttribute(key, value);
    }
}

function removeAttribute(element, key, oldValue) {
    if (key.startsWith("on") && typeof oldValue === "function") {
        const eventType = key.substring(2).toLowerCase();
        eventManager.off(element, eventType);
        return;
    }

    if (key === "className") {
        element.className = "";
        return;
    }

    if (key === "value") {
        element.value = "";
        return;
    }

    if (key === "checked") {
        element.checked = false;
        return;
    }

    element.removeAttribute(key);
}

function updateAttribute(element, oldAttrs = {}, newAttrs = {}) {
    Object.keys(oldAttrs).forEach(key => {
        if (!(key in newAttrs)) {
            removeAttribute(element, key, oldAttrs[key]);
        }
    });

    Object.entries(newAttrs).forEach(([key, value]) => {
        if (oldAttrs[key] !== value) {
            setAttribute(element, key, value);
        }
    });
}
