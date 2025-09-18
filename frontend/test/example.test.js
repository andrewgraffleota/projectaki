/**
 * @jest-environment jsdom
 */

const { LiveTimetableChatbot } = require("./chatbot.js")


test("Testing to see if Chatbox to not be open at first", () => {
    const LTCObject = new LiveTimetableChatbot();
    expect(LTCObject.isOpen).toBe(false);
});


test("Testing if the loading the chatbot works", () => {
    const LTCObject = new LiveTimetableChatbot();
    expect(LTCObject.isLoading).toBe(false);
    LTCObject.loadChatbot();
});