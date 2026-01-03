'use client';

import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';

export default function Home() {
  return (
    <>
      <Header />

      <main>
        <section className="hero bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-4">
              Track Your Transit in Real-Time
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Never miss a bus, train, or ride again
            </p>
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition">
              Download Now
            </button>
          </div>
        </section>

        <section id="features" className="features py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition">
                <h3 className="text-2xl font-bold mb-4 text-blue-600">
                  Real-Time Tracking
                </h3>
                <p className="text-gray-600">
                  Track public transportation in real-time
                </p>
              </div>
              <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition">
                <h3 className="text-2xl font-bold mb-4 text-blue-600">
                  Notifications
                </h3>
                <p className="text-gray-600">
                  Get alerts for departures and arrivals
                </p>
              </div>
              <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition">
                <h3 className="text-2xl font-bold mb-4 text-blue-600">
                  Integrate APIs
                </h3>
                <p className="text-gray-600">
                  Connect with various transit APIs for comprehensive data
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="tutorials" className="tutorials bg-purple-700 text-white py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-4">Tutorials</h2>
            <p className="text-xl mb-4">Learn how to use Transit Tracker effectively</p>
            <div className="relative inline-block w-full max-w-2xl mt-8">
              <Image
                src="/app.png"
                alt="App Tutorial"
                width={500}
                height={600}
                className="rounded-lg shadow-lg mx-auto"
              />

              <div className="absolute group cursor-pointer" style={{ top: '8%', left: '76%' }}>
                <div className="w-4 h-4 bg-blue-400 rounded-full opacity-70 hover:opacity-100 hover:scale-125 transition-all"></div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-3 py-2 rounded whitespace-nowrap text-sm">
                  Options
                </div>
              </div>

              <div className="absolute group cursor-pointer" style={{ top: '37%', left: '75%' }}>
                <div className="w-4 h-4 bg-blue-400 rounded-full opacity-70 hover:opacity-100 hover:scale-125 transition-all"></div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-3 py-2 rounded whitespace-nowrap text-sm">
                  The Original Api
                </div>
              </div>

              <div className="absolute group cursor-pointer" style={{ top: '58.5%', left: '75%' }}>
                <div className="w-4 h-4 bg-blue-400 rounded-full opacity-70 hover:opacity-100 hover:scale-125 transition-all"></div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-3 py-2 rounded whitespace-nowrap text-sm">
                  Our Api
                </div>
              </div>

              <div className="absolute group cursor-pointer" style={{ top: '91%', left: '68%' }}>
                <div className="w-4 h-4 bg-blue-400 rounded-full opacity-70 hover:opacity-100 hover:scale-125 transition-all"></div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-3 py-2 rounded whitespace-nowrap text-sm">
                  Log out
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="pricing bg-gray-100 py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-4">Pricing</h2>
            <p className="text-xl mb-8 text-gray-600">Free to download and use</p>
            <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition">
              Download Now
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-white text-center py-8">
        <p className="mb-4">&copy; 2025 Transit Tracker. All rights reserved.</p>
        <ul className="flex justify-center space-x-6">
          <li><Link href="/" className="hover:text-blue-400">Home</Link></li>
          <li><Link href="/contact" className="hover:text-blue-400">Contact</Link></li>
          <li><Link href="/rgpd" className="hover:text-blue-400">Privacy Policy</Link></li>
        </ul>
      </footer>
    </>
  );
}
