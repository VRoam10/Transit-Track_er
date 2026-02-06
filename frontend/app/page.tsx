'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { useEffect, useState } from 'react';

export default function Home() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const container = document.querySelector("main")

    if (!container) return

    const onScroll = () => {
      setScrolled(container.scrollTop > window.innerHeight * 0.3)
    }

    container.addEventListener("scroll", onScroll)
    return () => container.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <>
      <Header scrolled={scrolled} />
      <main className='snap-y snap-mandatory overflow-y-scroll h-screen scroll-smooth'>
        <section id='home' className="snap-center text-black dark:text-white py-30 px-4 h-screen">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-4">
              Track Your Transit in Real-Time
            </h1>
            <p className="text-xl mb-8 text-gray-900 dark:text-gray-300">
              Never miss a bus, train, or ride again
            </p>
            <button className="bg-custom-blue dark:bg-gray-800 text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-100 hover:dark:bg-gray-700 transition">
              Download Now
            </button>
          </div>
        </section>

        <section id="features" className="snap-center features py-30 px-4 h-screen">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-zinc-800 p-8 rounded-lg shadow hover:shadow-lg transition">
                <h3 className="text-2xl font-bold mb-4 text-blue-600">
                  Real-Time Tracking
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Track public transportation in real-time
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-800 p-8 rounded-lg shadow hover:shadow-lg transition">
                <h3 className="text-2xl font-bold mb-4 text-blue-600">
                  Notifications
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Get alerts for departures and arrivals
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-800 p-8 rounded-lg shadow hover:shadow-lg transition">
                <h3 className="text-2xl font-bold mb-4 text-blue-600">
                  Integrate APIs
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Connect with various transit APIs for comprehensive data
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="tutorials" className="snap-center tutorials text-black dark:text-white py-30 px-4 h-screen">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-4">Tutorials</h2>
            <p className="text-xl mb-4">Learn how to use Transit Tracker effectively</p>
            <div className="relative inline-block w-full max-w-2xl mt-8">
            </div>
          </div>
        </section>

        <section id="pricing" className="snap-center pricing py-30 px-4 h-screen">
          <article className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-4">Pricing</h2>
            <p className="text-xl mb-8 text-gray-600 dark:text-gray-300">Free to download and use</p>
            <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition">
              Download Now
            </button>
          </article>
        </section>
        <Footer />
      </main>

    </>
  );
}
