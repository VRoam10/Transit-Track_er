'use client';

import Header from '@/components/Header';
import Login from '../ui/login';

export default function login() {
    return (
        <>
            <Header />

            <main>
                <section className="login py-20 px-4">
                    <div className="max-w-3xl mx-auto">
                        <h1 className="text-4xl font-bold text-center mb-4">Login</h1>
                        <div className="bg-white p-8 rounded-lg shadow-lg">
                            <Login />
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}