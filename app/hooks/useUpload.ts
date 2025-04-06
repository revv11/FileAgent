'use client'

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import {v4 as uuidv4} from "uuid"
import { useEdgeStore } from "@/app/context/edgestore"
import { setDoc, doc } from "firebase/firestore"
import { db } from "@/firebase"
import { generateEmbeddings } from "@/actions/generateEmbeddings"
export enum StatusText{
    UPLOADING = 'Uploading file...',
    UPLOADED = "file uploaded successfully",
    SAVING =    "Saving file to database...",
    GENERATING = "Generating AI Embeddings, This will only take a few seconds..."
}

export type Status = StatusText[keyof StatusText]

function useUpload() {
    const [progress, setProgress] = useState<number | null>(null)
    const [fileId, setFileId] = useState<string | null>(null)
    const [status, setStatus] = useState<Status | null>(null)
    const { user } = useUser();
    const {edgestore} = useEdgeStore()
    
    const handleUpload = async (file:File) =>{
      if(!file || !user) return;
      try{
          const fileIdToUploadTo = uuidv4();
          const res = await edgestore.publicFiles.upload({
              file,
              onProgressChange: (progress) => {
                setStatus(StatusText.UPLOADING)
                setProgress(progress);
              },
            });
              // you can run some server action or api here
              // to add the necessary data to your database
            console.log(res);
            const downloadUrl = res.url
            setStatus(StatusText.SAVING)
            await setDoc(doc(db, "users", user.id, 'files', fileIdToUploadTo ),{
              url: res.url,
              size: res.size,
              uploadedAt: res.uploadedAt,
              metadata: res.metadata,
              path: res.path,
            } )

          setStatus(StatusText.GENERATING);


          
          console.log('generating embeddings')
          await generateEmbeddings(fileIdToUploadTo)
          
          console.log("embeddings generated")    
          
          setFileId(fileIdToUploadTo)

        }
        catch(e){
          console.log(e)
           
        }
    }
    return {progress, status, fileId, handleUpload}
}

export default useUpload