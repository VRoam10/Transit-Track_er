import Sidebar from "@/components/Sidebar";
import Connector from "../../../components/Connector";

export default async function Page({
    params,
}: {
    params: Promise<{ connector: string }>
}) {
    const { connector } = await params

    return (
        <main className="flex">
            <Sidebar />
            <section className="ml-64 flex-1 py-6 px-6 bg-gray-50 dark:bg-black">
                <div>
                    <h2 className="text-3xl font-bold mb-8">Connector</h2>
                    <Connector connector={connector} />
                </div>
            </section>
        </main>
    );
}