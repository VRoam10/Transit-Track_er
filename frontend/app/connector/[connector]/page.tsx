import Header from "@/components/Header";
import Link from "next/link";
import Connector from "../../../components/Connector";

export default async function Page({
    params,
}: {
    params: Promise<{ connector: string }>
}) {
    const { connector } = await params

    return (
        <>
            <Header />
            <main>
                <Link href={`/connector`} className="bg-blue-600 text-white px-4 py-2 rounded-br-lg hover:bg-blue-700">Back to All Connector</Link>
                <section className="dashboard py-20 px-4">
                    <div className="max-w-3xl mx-auto">
                        <h2 className='text-2xl text-center mb-3'>Connector</h2>
                        <div className="bg-white p-8 rounded-lg shadow-lg">
                            <div className="text-center text-gray-600">
                                <Connector connector={connector} />
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}