import express from "express";
import dotenv from "dotenv";
import {ChatGroq} from "@langchain/groq"; 
import fs from "fs";
import { PDFParse } from "pdf-parse";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";



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

const upload = async (req, res) => {
    const pdfPath = "./knowledge.pdf";
    const buffer = fs.readFileSync(pdfPath);
    const pdfResult = new PDFParse({data: buffer});
    const result = await pdfResult.getText();
    const text 
    return result;
}
const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    apiKey: process.env.GOOGLE_API_KEY,
});
let pages = [];
const cosine = (a, b) => {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
};
const topPages = async (question, n = 4) => {
    const q = await embeddings.embedQuery(question);
    return pages
        .map((p) => ({...p, score: cosine(q, p.vector)}))
        .sort((a, b) => b.score - a.score)
        .slice(0, n)
        .sort((a, b) => a.num - b.num);
};
upload().then(async (result) => {
    const vectors = await embeddings.embedDocuments(result.pages.map((p) => p.text));
    pages = result.pages.map((p, i) => ({num: p.num, text: p.text, vector: vectors[i]}));
    console.log(`PDF extracted: ${pages.length} pages`);
}).catch((error) => {
    console.error("Error extracting PDF text:", error);
});

app.post("/ai", async (req, res) => {
    try {
        const {input} = req.body;
        if (!pages.length) return res.status(503).json({error: "Knowledge base is still loading, try again in a few seconds."});
        const context = (await topPages(input)).map((p) => `[Page ${p.num}]\n${p.text.slice(0, 3000)}`).join("\n\n");
        const response = await llm.invoke([
            {role: "system", content: "You are a helpful assistant jarvis. Answer in short plain text using only this knowledge base. If the answer is not in it, say you don't know.\n\n" + context},
            {role: "user", content: input},
        ]);
        const text = String(response.content)
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