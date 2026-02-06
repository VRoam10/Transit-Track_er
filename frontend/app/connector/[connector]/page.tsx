import Sidebar from "@/components/Sidebar";
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
            <main className="flex">
                <Sidebar />
                <section className="connector ml-64 flex-1 py-20 px-4">
                    <div className="max-w-3xl mx-auto">
                        <h2 className='text-2xl text-center mb-3'>Connector</h2>
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
                            <div className="text-center text-gray-600 dark:text-gray-300">
                                <Connector connector={connector} />
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}