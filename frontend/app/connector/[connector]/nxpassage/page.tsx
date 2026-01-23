import Header from "@/components/Header"
import Transformer from "@/components/Transformer"
import Link from "next/link"

export default async function Page({
    params,
}: {
    params: Promise<{ connector: string }>
}) {
    const { connector } = await params

    return (
        <>
            <Header />
            <Link href={`/connector/${connector}`} className="bg-blue-600 text-white px-4 py-2 rounded-br-lg hover:bg-blue-700">Back to Connector</Link>
            <Transformer subroute="nxpassage" connectorId={connector} />
        </>
    )
}