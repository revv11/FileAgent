
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import pineconeClient from "./pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { PineconeConflictError } from "@pinecone-database/pinecone/dist/errors";
import { Index, RecordMetadata } from "@pinecone-database/pinecone";
import { adminDb } from "../firebaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { TaskType } from "@google/generative-ai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";


export const model = new ChatGoogleGenerativeAI({
   
    model : "gemini-2.0-flash",
})


export const indexName = "revv";

async function fetchMessagesFromDB(docId: string) {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("User not found");
    }
  
    console.log("--- Fetching chat history from the firestore database... ---");
    // Get the last 6 messages from the chat history
    const chats = await adminDb
      .collection(`users`)
      .doc(userId)
      .collection("files")
      .doc(docId)
      .collection("chat")
      .orderBy("createdAt", "desc")
      // .limit(LIMIT)
      .get();
  
    const chatHistory = chats.docs.map((doc) =>
      doc.data().role === "human"
        ? new HumanMessage(doc.data().message)
        : new AIMessage(doc.data().message)
    );
  
    console.log(
      `--- fetched last ${chatHistory.length} messages successfully ---`
    );
    console.log(chatHistory.map((msg) => msg.content.toString()));
  
    return chatHistory;
  }

export async function generateDocs(docId:string){
    const {userId} = await auth();

    if(!userId){
        throw new Error("User not found")
    }
    const firebaseRef = await adminDb
        .collection("users")
        .doc(userId)
        .collection("files")
        .doc(docId)
        .get()

    const downloadUrl  = firebaseRef.data()?.url;

    console.log("downoload urllllll",downloadUrl)
    if(!downloadUrl){
        throw new Error("url not found")
    }

    const response = await fetch(downloadUrl)
    console.log("--Loading PDF document..---")
    const data = await response.blob()
    const loader = new PDFLoader(data);
    const docs = await loader.load()

    console.log("--- Splitting the document into smaller parts... ---");
    const splitter = new RecursiveCharacterTextSplitter();
  
    const splitDocs = await splitter.splitDocuments(docs);
    console.log(`--- Split into ${splitDocs.length} parts ---`);
  
    return splitDocs;
}

async function namespaceExists(index: Index<RecordMetadata>, namespace: string){
    if(namespace === null) throw new Error("No namespace value provided");

    const {namespaces} = await index.describeIndexStats();
    return namespaces?.[namespace] !== undefined
    
    
}

export async function generateEmbeddingsInPinecondeVectorStore(docId: string){
    const {userId} = await auth();

    if(!userId){
        throw new Error("User not found");

    }

    let pineconeVectorStore;

    //generating embeddings (numerical representation) for the split documents

    console.log("---GENERATING EMBEDDINGS from the split documents--")

    const embeddings = new GoogleGenerativeAIEmbeddings({
        model: "text-embedding-004", // 1536 dimensions
        taskType: TaskType.RETRIEVAL_DOCUMENT,
        title: "Document title",
      });

    const index = await pineconeClient.index(indexName)

    //check if the namespace exists

    const namespaceAlreadyExists = await namespaceExists(index, docId)

    if(namespaceAlreadyExists){
        console.log(`---Namespace ${docId} already exists, resuing existing embeddings..---`)


        pineconeVectorStore = await PineconeStore.fromExistingIndex(embeddings,{
            pineconeIndex: index,
            namespace: docId
        })

        return pineconeVectorStore
    }
    else{
        //fetch the url from firestore then download the file then split and generate embeddings
        const splitDocs = await generateDocs(docId);

        console.log(
            `==storing the embeddings`
        )
        pineconeVectorStore = await PineconeStore.fromDocuments(
            splitDocs,
            embeddings,
            {
                pineconeIndex: index,
                namespace: docId
            }
        )

        return pineconeVectorStore

    }
}


export const generateLangchainCompletion = async (docId: string, question : string)=>{

   


    const pineconeVectorStore = await generateEmbeddingsInPinecondeVectorStore(docId)

    if (!pineconeVectorStore){
        throw new Error('Pincone vector store not found')
    }

    

    console.log("---create a retriver---")
    const retriever = pineconeVectorStore.asRetriever();

    const chatHistory = await fetchMessagesFromDB(docId);


    console.log("---Defining a prompt template...---")

    const historyAwarePrompt  = ChatPromptTemplate.fromMessages([
        ...chatHistory,
        ["user", "{input}"],
        [
            "user",
            "Given the above conversation, generate a search query to look up in order to get information relevant to the conversations"
        ]
    ]);

    console.log("--creating a history-aware retriever chain..---")

    const historyAwareRetrieverChain = await createHistoryAwareRetriever({
        llm: model,
        retriever,
        rephrasePrompt: historyAwarePrompt
    })

    const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          "Answer the user's questions based on the below context:\n\n{context}",
        ],
    
        ...chatHistory, // Insert the actual chat history here
    
        ["user", "{input}"],
      ]);

      console.log("--- Creating a document combining chain... ---");
      const historyAwareCombineDocsChain = await createStuffDocumentsChain({
        llm: model,
        prompt: historyAwareRetrievalPrompt,
      });
    
      // Create the main retrieval chain that combines the history-aware retriever and document combining chains
      console.log("--- Creating the main retrieval chain... ---");
      const conversationalRetrievalChain = await createRetrievalChain({
        retriever: historyAwareRetrieverChain,
        combineDocsChain: historyAwareCombineDocsChain,
      });
    
      console.log("--- Running the chain with a sample conversation... ---");
      const reply = await conversationalRetrievalChain.invoke({
        chat_history: chatHistory,
        input: question,
      });
    
      // Print the result to the console
      console.log(reply.answer);
      return reply.answer;
}