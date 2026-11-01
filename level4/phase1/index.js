import express from "express";
import dotenv from "dotenv";
import {ChatGroq} from "@langchain/groq"; 
import { Chat, GoogleGenAI } from "@google/genai";
import { Annotation, MemorySaver, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI} from "@langchain/google-genai";
import {ToolNode} from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";



dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// const ai = new GoogleGenAI({
//     apiKey: process.env.GEMINI_API_KEY,
// });
app.use(express.json());

// app.post("/ai", async (req, res) => {
//     const {input} = req.body;
//     const response = await ai.models.generateContent({
//         model: "gemini-3.8-flash",
//         contents: [{role: "system",     
//             parts:[{text:"You are a helpful assistant jarvis."}]},
//             {role: "user", parts:[{text: input}]},{role: "user", parts:[{text: input}]}
//         ]
//     });
//     return res.json({output: response.text});
// });

//with langchain




const tool = new TavilySearch({
    maxResults: 1,
    topic: "general",
    tavilyApiKey: process.env.Tavily_API_KEY,
});

const checkPointer = new MemorySaver()

const tools = [tool]
const toolNode = new ToolNode(tools)



const llm = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0.7,   
    maxTokens: 500,
    maxRetries: 2
}).bindTools(tools)














const State = Annotation.Root({
    prompt: Annotation(),
    aiMsg: Annotation()
});




const callLLM = async (state) => {
    console.log("state:", state);

    const response = await llm.invoke([
        {role: "system", content: "You are a helpful assistant jarvis. Reply in short plain text only: no markdown, no tables, no bold, no special unicode spaces."},
        ...state.messages,
    ]);

    return {messages:[response]};
}

const shouldContinue = (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    if(lastMessage.tool_calls.length > 0) {
        return "tools";
    }else {
        return "__end__";
    }
}

const graph = new StateGraph(MessagesAnnotation)
.addNode("agent", callLLM)
.addNode("tools", toolNode)
.addEdge("__start__", "agent")
.addEdge("tools", "agent")
.addConditionalEdges("agent", shouldContinue)
.compile({checkpointer: checkPointer})












app.post("/ai", async (req, res) => {
    try {
        const {input, threadId = "user123"} = req.body;
        const response = await graph.invoke(
            {messages:[{role: "user", content: input}]},
            {configurable: {thread_id: threadId}}
        );
        console.log("response:", response);

        const text = String(response.messages.at(-1).content)
            .replace(/[    ]/g, " ")
            .replace(/[‐-―‑]/g, "-");
        return res.status(200).json({ai: text});
    } catch (e) {
        return res.status(e.status || 500).json({error: e.message});
    }
});







app.get("/", (req, res) => {
    return res.send("Hello from Level 4");
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});