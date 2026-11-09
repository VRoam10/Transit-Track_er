import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"
import Transformer from "@/components/Transformer"
import Link from "next/link"

export default async function Page({
    params,
}: {
    params: Promise<{ connector: string }>
}) {
    const { connector } = await params

    return (
        <main className='flex'>
            <Sidebar />
            <Transformer subroute="nxpassage" connectorId={connector} />
        </main>
    )
}