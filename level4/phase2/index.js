import express from "express";
import dotenv from "dotenv";
import {ChatGroq} from "@langchain/groq"; 
import fs from "fs";
import { PDFParse } from "pdf-parse";

import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());



const llm = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0.7,   
    maxTokens: 500,
    maxRetries: 2
});

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001", // 768 dimensions
  taskType: TaskType.RETRIEVAL_DOCUMENT,
});

 
const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  collectionName: "knowledge",
});

const upload = async (req, res) => {
    const pdfPath = "./knowledge.pdf";
    const buffer = fs.readFileSync(pdfPath);
    const pdfResult = new PDFParse({data: buffer});
    const result = await pdfResult.getText();
    const text = result.text;
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    const docs = await splitter.createDocuments([text]);
    await vectorStore.addDocuments(docs);
};

const {count} = await vectorStore.client.count("knowledge");
if (count === 0) {
    await upload();
    console.log("Indexed PDF into Qdrant");
}

app.post("/ai", async (req, res) => {
   const {input} = req.body;
const docs = await vectorStore.similaritySearch(input, 5);
const context = docs.map((doc) => doc.pageContent).join("\n");
const response = await llm.invoke([
    new SystemMessage("You are a helpful assistant that answers questions based on the provided context. don't make up answers. If the answer is not in the context, say 'I don't know'. if answer is not in the context, say 'I don't know'."),
    new HumanMessage(`Answer the question based on the context below:\n\nContext:\n${context}\n\nQuestion:\n${input}`)
])
return res.json({response});    
});







app.get("/", (req, res) => {
    return res.send("Hello from Level 4");
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 