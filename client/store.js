import { createStore } from "../framework/index.js";

export const initialState = {
    nickname: "",
    joined: false,
    playerId: null,
    socketOpen: false,
    error: "",
    server: null,
    chatDraft: "",
};

function reducer(state = initialState, action) {
    switch (action.type) {
        case "SET_NICKNAME":
            return { ...state, nickname: action.nickname };
        case "SOCKET_OPEN":
            return { ...state, socketOpen: true, error: "" };
        case "SOCKET_CLOSED":
            return { ...state, socketOpen: false, error: "Disconnected from the server." };
        case "SET_ERROR":
            return { ...state, error: action.error };
        case "JOINED":
            return { ...state, joined: true, playerId: action.playerId, error: "" };
        case "REJOIN_FAILED":
            return { ...state, joined: false, playerId: null };
        case "SERVER_STATE":
            return { ...state, server: action.server };
        case "TICK":
            return { ...state };
        case "SET_CHAT_DRAFT":
            return { ...state, chatDraft: action.text };
        case "CLEAR_CHAT_DRAFT":
            return { ...state, chatDraft: "" };
        default:
            return state;
    }
}

export const store = createStore(reducer, initialState);
