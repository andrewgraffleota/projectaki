/**
 * @jest-environment jsdom
 */

const { LiveTimetableChatbot } = require("./chatbot.js")


test("Testing to see if Chatbox is not open at first", () => {
    const LTCObject = new LiveTimetableChatbot();
    expect(LTCObject.isOpen).toBe(false);
});

test("Testing if the loading the chatbot works", () => {
    const LTCObject = new LiveTimetableChatbot();
    expect(LTCObject.isLoading).toBe(false);
});

test("Testing if the chatbot LLM is being used", () => {
    const LTCObject = new LiveTimetableChatbot();
    expect(LTCObject.useLLM).toBe(true);
});

//changing not within the code would be done in selenium tests (automation testing)
test("Testing if the system prompt can be changed (within the code only)", () => {
    const LTCObject = new LiveTimetableChatbot();
    LTCObject.systemPrompt = "You are a mentore for university students, guide theses students on what questions they have including timetable related questions";
    expect(LTCObject.systemPrompt).toBe("You are a mentore for university students, guide theses students on what questions they have including timetable related questions");
});

test('Testing if the toggleChatbot method opens and closes the chatbot', () => {
    const LTCObject = new LiveTimetableChatbot();

    expect(LTCObject.isOpen).toBe(false);

    LTCObject.toggleChatbot();
    expect(LTCObject.isOpen).toBe(true);
    expect(document.getElementById('chatbotContainer').classList.contains('active')).toBe(true);

    LTCObject.toggleChatbot();
    expect(LTCObject.isOpen).toBe(false);
    expect(document.getElementById('chatbotContainer').classList.contains('active')).toBe(false);
});

test("Testing if the UpdateModelStatus method successfully changes the model", () => {
    const LTCObject = new LiveTimetableChatbot();

    LTCObject.useLLM = false;
    expect(LTCObject.useLLM).toBe(false);
    expect(document.getElementById("modelStatus").value = "").toBe("");

    LTCObject.useLLM = true;
    expect(LTCObject.useLLM).toBe(true);
    expect(document.getElementById("modelStatus").value = "gpt-4").toBe("gpt-4");
});

//chatMessages

//test("", () => {
//    const LTCObject = new LiveTimetableChatbot();
//});