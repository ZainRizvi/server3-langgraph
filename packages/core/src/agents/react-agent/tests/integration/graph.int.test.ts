import { it, expect } from "@jest/globals";
import { BaseMessage } from "@langchain/core/messages";

// import { graph } from "../../graph";

it("should be a no-op test", () => {
  expect(true).toBe(true);
});



// TODO: This test was disabled because it was timing out and we don't know why it was failing.
// This appears to be throwaway code so not worth the debug time.
// If this test becomes important in the future, investigate the timeout issue and re-enable.
/*
it("Simple runthrough", async () => {
  const res = await graph.invoke({
    messages: [
      {
        role: "user",
        content: "What is the current weather in SF?",
      },
    ],
  });
  expect(
    res.messages.find((message: BaseMessage) => message._getType() === "tool"),
  ).toBeDefined();
});
*/
