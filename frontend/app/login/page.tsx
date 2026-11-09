'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { useEffect, useState } from 'react';
import Login from '../ui/login';

export default function login() {
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const onScroll = () => {
            setScrolled(window.scrollY > 10)
        }

        window.addEventListener("scroll", onScroll)
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    return (
        <main>
            <Header scrolled={scrolled} />

            <section className="login py-30 px-4">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-4xl font-bold text-center mb-4">Login</h1>
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg">
                        <Login />
                    </div>
                </div>
            </section>
            <Footer />
        </main>
    )
}