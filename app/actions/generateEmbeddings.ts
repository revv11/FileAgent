"use server"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache";
import { generateEmbeddingsInPinecondeVectorStore } from "@/lib/langchain";

export async function generateEmbeddings(docId: string){
    auth.protect();

    //turn pdf into embeddings
    await generateEmbeddingsInPinecondeVectorStore(docId)


    revalidatePath('/dashboard')

    return {completed: true}
}