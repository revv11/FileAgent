import { Pinecone } from '@pinecone-database/pinecone';

if(!process.env.PINECONE_API_KEY){
    throw new Error("PINECONE API KEY NOT SET")
}

const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

export default pineconeClient;