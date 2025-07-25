import { DataAPIClient, DEFAULT_KEYSPACE } from "@datastax/astra-db-ts"
import { Browser, PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import "dotenv/config"

type SimilarityMetric = "dot_product" | "cosine" | "euclidean"
const { ASTRA_DB_NAMESPACE, ASTRA_DB_COLLECTION, ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN } = process.env

const huggingFace = new HuggingFaceInferenceEmbeddings({
  model: "BAAI/bge-m3",
  apiKey: process.env.HUGGINGFACE_API_KEY,
});

const cleantechData = [
    "https://globalcleantechdirectory.com/",
    "https://globalcleantechdirectory.com/about-us/",
    "https://globalcleantechdirectory.com/our-journey/",
    "https://globalcleantechdirectory.com/innovation-lab/",
    "https://globalcleantechdirectory.com/help-center/",
    "https://globalcleantechdirectory.com/global-cleantech-mentorship-program/",
    "https://globalcleantechdirectory.com/news/",
    "https://globalcleantechdirectory.com/contact/",
    "https://globalcleantechdirectory.com/agritech-sustainable-agriculture/",
    "https://globalcleantechdirectory.com/artificial-intelligence-ai/",
    "https://globalcleantechdirectory.com/environmental-sustainability-association/",
    "https://globalcleantechdirectory.com/environmental-monitoring-analysis/",
    "https://globalcleantechdirectory.com/environmental-sustainability-education/",
    "https://globalcleantechdirectory.com/food-sustainability-solutions/",
    "https://globalcleantechdirectory.com/forest-sustainable-development/",
    "https://globalcleantechdirectory.com/green-building-sustainability/",
    "https://globalcleantechdirectory.com/green-economy-trade/",
    "https://globalcleantechdirectory.com/green-manufacturing-sustainability/",
    "https://globalcleantechdirectory.com/green-sustainable-chemistry/",
    "https://globalcleantechdirectory.com/land-sustainable-development/",
    "https://globalcleantechdirectory.com/ocean-sustainable-development/",
    "https://globalcleantechdirectory.com/professional-service-environment/",
    "https://globalcleantechdirectory.com/renewable-energy-sustainability/",
    "https://globalcleantechdirectory.com/smart-city-sustainable/",
    "https://globalcleantechdirectory.com/space-sustainability-solutions/",
    "https://globalcleantechdirectory.com/sustainable-transportation-solutions/",
    "https://globalcleantechdirectory.com/waste-management-sustainable/",
    "https://globalcleantechdirectory.com/water-management-sustainable/"
]

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT!, { keyspace: ASTRA_DB_NAMESPACE})

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100
})

const createCollection = async (SimilarityMetric: SimilarityMetric = "dot_product") => {
    const res = await db.createCollection(ASTRA_DB_COLLECTION!, {
        vector: {
            dimension: 1024,
            metric: SimilarityMetric
        }
    })
    console.log(res)
}

const loadSampleData = async () => {
    const collection = await db.collection(ASTRA_DB_COLLECTION!)
    for await ( const url of cleantechData) {
        const content = await scrapePage(url) 
        const chunks = await splitter.splitText(content)
        for await ( const chunk of chunks) {
            const exists = await collection.findOne({ text: chunk });
            if (exists) {
                console.log("Chunk already exists, skipping insert.");
                continue;
            }

            const embedding = await huggingFace.embedQuery(chunk);
            const res = await collection.insertOne({
                $vector: embedding,
                text: chunk
            })
            console.log(res)
        }
    }
}

const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: {
            headless: true
        },
        gotoOptions: {
            waitUntil: "domcontentloaded"
        },
        evaluate: async (page, browser) => {
            const result = await page.evaluate(() => document.body.innerHTML)
            await browser.close()
            return result
        }
    })
    return ( await loader.scrape())?.replace(/<[^>]*>?/gm, '|')
}

createCollection().then(() => loadSampleData())

