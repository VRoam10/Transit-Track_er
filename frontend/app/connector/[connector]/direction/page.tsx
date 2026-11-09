import Sidebar from '@/components/Sidebar';
import Transformer from '@/components/Transformer';

export default async function Page({
    params,
}: {
    params: Promise<{ connector: string }>
}) {
    const { connector } = await params

    return (
        <main className='flex'>
            <Sidebar />
            <Transformer subroute="direction" connectorId={connector} />
        </main>
    )
}