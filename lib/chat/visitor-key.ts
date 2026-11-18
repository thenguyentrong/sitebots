// A visitor's own Anthropic key: what it looks like and the header it travels in. Shared by the page,
// which checks the shape before sending, and the server, which checks it again before any call.

export const API_KEY_PATTERN = /^sk-ant-[A-Za-z0-9_-]{20,200}$/;
export const API_KEY_HEADER = 'x-visitor-api-key';
