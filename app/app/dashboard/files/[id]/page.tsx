import React from "react"
import { auth } from "@clerk/nextjs/server"
import { adminDb } from "@/firebaseAdmin"
import PdfView from "@/components/PdfView"
import Chat from "@/components/Chat"




export default async function page({params}: {params:  Promise<{ id: string }>}) {
    auth.protect()
    // const param = React.use(params)
    const {id} = await params
    const {userId} = await auth()

    const ref = await  adminDb
        .collection("users")
        .doc(userId!)
        .collection("files")
        .doc(id)
        .get()

    const url = ref.data()?.url
    return (
        <div className="grid lg:grid-cols-5 h-full overflow-hidden">
          {/* Right */}
          <div className="col-span-5 lg:col-span-2 overflow-y-auto">
            {/* Chat */}
            <Chat id={id} />
          </div>
    
          {/* Left */}
          <div className="col-span-5 lg:col-span-3 bg-gray-100 border-r-2 lg:border-indigo-600 lg:-order-1 overflow-auto">
            {/* PDFView */}
            <PdfView url={url} />
          </div>
        </div>
      );
    }

