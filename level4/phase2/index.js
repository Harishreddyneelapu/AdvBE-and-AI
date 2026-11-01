import express from "express";
import dotenv from "dotenv";
import {ChatGroq} from "@langchain/groq"; 
import fs from "fs";
import { PDFParse } from "pdf-parse";



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
    const text = await pdfResult.getText();
    return text;
}
let pages = [];
const words = (t) => t.toLowerCase().match(/[a-z0-9]{3,}/g) || [];
const topPages = (question, n = 3) => {
    const q = new Set(words(question));
    return pages
        .map((p) => ({...p, score: words(p.text).filter((w) => q.has(w)).length}))
        .sort((a, b) => b.score - a.score)
        .slice(0, n)
        .sort((a, b) => a.num - b.num);
};
upload().then((result) => {
    pages = result.pages.map((p) => ({num: p.num, text: p.text}));
    console.log(`PDF extracted: ${pages.length} pages`);
}).catch((error) => {
    console.error("Error extracting PDF text:", error);
});

app.post("/ai", async (req, res) => {
    try {
        const {input, threadId = "user123"} = req.body;
        const response = await llm.invoke([
            {role: "system", content: "You are a helpful assistant jarvis. Answer in short plain text using only this knowledge base. If the answer is not in it, say you don't know.\n\n" + topPages(input).map((p) => `[Page ${p.num}]\n${p.text.slice(0, 3000)}`).join("\n\n")},
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