'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = document.querySelector("main")
    if (!container) return

    const onScroll = () => {
      setScrolled(container.scrollTop > window.innerHeight * 0.3)
    }

    container.addEventListener("scroll", onScroll)
    return () => container.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return

    let isDown = false
    let startX = 0
    let scrollLeft = 0

    const onMouseDown = (e: MouseEvent) => {
      isDown = true
      el.classList.add('cursor-grabbing')
      el.classList.remove('cursor-grab')
      startX = e.clientX
      scrollLeft = el.scrollLeft
    }

    const stop = () => {
      isDown = false
      el.classList.remove('cursor-grabbing')
      el.classList.add('cursor-grab')
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return
      e.preventDefault()
      const walk = (e.clientX - startX) * 1.5
      el.scrollLeft = scrollLeft - walk
    }

    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('mouseleave', stop)
    el.addEventListener('mouseup', stop)
    el.addEventListener('mousemove', onMouseMove)

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('mouseleave', stop)
      el.removeEventListener('mouseup', stop)
      el.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  return (
    <>
      <Header scrolled={scrolled} />

      <main className='snap-y snap-mandatory overflow-y-scroll h-screen scroll-smooth'>
        {/* Hero */}
        <section id="home" className="snap-center h-screen flex flex-col justify-center items-center px-6 bg-gray-200 text-black relative overflow-hidden">
          <div className="max-w-6xl mx-auto text-center">
            <p className="uppercase tracking-[0.3em] text-sm text-blue-400 mb-8">Real-Time Transit Intelligence</p>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] mb-8">
              Track every <span className="text-custom-blue">bus</span> and <span className="text-custom-blue">metro</span> in real&#8209;time
            </h1>
            <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-12">
              Never miss a departure again. Live arrival times, smart alerts, and all your routes — in one place.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button className="bg-custom-blue text-white px-8 py-4 rounded-full font-semibold hover:brightness-110 transition">
                Download Now
              </button>
              <a href="/#features" className="border border-gray-500 text-black px-8 py-4 rounded-full font-semibold hover:border-black transition">
                Learn More
              </a>
            </div>
          </div>
          {/* Stats bar */}
          <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-16 md:gap-24 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-bold">50K+</p>
              <p className="text-sm text-gray-500 mt-1">Active Users</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold">200+</p>
              <p className="text-sm text-gray-500 mt-1">Cities Covered</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold">99.9%</p>
              <p className="text-sm text-gray-500 mt-1">Uptime</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="snap-center h-screen flex flex-col justify-center px-6">
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16">
              <h2 className="text-4xl md:text-6xl font-bold leading-tight max-w-2xl">
                Turning transit data into <span className="text-custom-blue">real actions</span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-4 md:mt-0 text-lg">
                Everything you need to navigate the city, all in one powerful app.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group bg-gray-50 dark:bg-zinc-800 p-10 rounded-3xl hover:bg-custom-blue hover:text-white transition-all duration-300">
                <span className="text-5xl font-black text-custom-blue group-hover:text-white transition-colors duration-300">01</span>
                <h3 className="text-2xl font-bold mt-6 mb-4">Real-Time Tracking</h3>
                <p className="text-gray-500 group-hover:text-blue-100 transition-colors duration-300 leading-relaxed">
                  See exactly when your bus or metro arrives with live GPS tracking and second-by-second updates.
                </p>
              </div>
              <div className="group bg-gray-50 dark:bg-zinc-800 p-10 rounded-3xl hover:bg-custom-blue hover:text-white transition-all duration-300">
                <span className="text-5xl font-black text-custom-blue group-hover:text-white transition-colors duration-300">02</span>
                <h3 className="text-2xl font-bold mt-6 mb-4">Smart Notifications</h3>
                <p className="text-gray-500 group-hover:text-blue-100 transition-colors duration-300 leading-relaxed">
                  Set alerts for your daily commute and get notified before your departure — never run for the bus again.
                </p>
              </div>
              <div className="group bg-gray-50 dark:bg-zinc-800 p-10 rounded-3xl hover:bg-custom-blue hover:text-white transition-all duration-300">
                <span className="text-5xl font-black text-custom-blue group-hover:text-white transition-colors duration-300">03</span>
                <h3 className="text-2xl font-bold mt-6 mb-4">API Connectors</h3>
                <p className="text-gray-500 group-hover:text-blue-100 transition-colors duration-300 leading-relaxed">
                  Integrate any transit provider in Europe through our connector system with custom data transformations.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="tutorials" className="snap-center text-black dark:text-white h-screen flex flex-col justify-center">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold mb-3">How It Works</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Get up and running in minutes — drag to explore each step
            </p>
          </div>
          <div
            ref={carouselRef}
            className="flex overflow-x-auto gap-6 px-8 pb-6 scrollbar-hide cursor-grab select-none"
          >
            {[
              { step: '01', title: 'Download the App', description: 'Get Transit Tracker from the App Store or Google Play and create your account in seconds.' },
              { step: '02', title: 'Find Your Station', description: 'Search for metro stations or bus stops near you and browse available lines.' },
              { step: '03', title: 'Set Up Alerts', description: 'Save your favorite routes and configure notifications so you never miss a departure.' },
              { step: '04', title: 'Track in Real-Time', description: 'View live arrival times, delays, and next passages all from your pocket.' },
            ].map((item) => (
              <div key={item.step} className="shrink-0 w-[80vw] max-w-[700px] bg-white dark:bg-zinc-800 rounded-3xl shadow-lg overflow-hidden flex flex-col md:flex-row">
                <div className="md:w-1/2 bg-gray-100 dark:bg-zinc-700 flex items-center justify-center p-8">
                  <div className="relative w-48 h-96 rounded-[2.5rem] border-4 border-gray-800 dark:border-gray-600 overflow-hidden shadow-xl bg-white">
                    <img src="/app.png" alt="App screenshot" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                  </div>
                </div>
                <div className="md:w-1/2 flex flex-col justify-center p-8 md:p-10">
                  <span className="text-5xl font-black text-custom-blue dark:text-blue-400 mb-4">{item.step}</span>
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="snap-center h-screen flex flex-col justify-center px-6 bg-black text-white">
          <div className="max-w-7xl mx-auto w-full">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-bold mb-4">Simple, transparent pricing</h2>
              <p className="text-lg text-gray-400 max-w-xl mx-auto">Free to download and use — premium features for power commuters.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Free */}
              <div className="border border-gray-700 rounded-3xl p-10 flex flex-col">
                <p className="text-sm uppercase tracking-widest text-gray-500 mb-4">Free</p>
                <p className="text-5xl font-bold mb-2">$0<span className="text-lg font-normal text-gray-500">/mo</span></p>
                <p className="text-gray-400 mb-8">Everything you need to get started.</p>
                <ul className="space-y-3 text-gray-300 mb-10 flex-1">
                  <li className="flex items-center gap-3"><span className="text-custom-blue text-lg">&#10003;</span>Real-time bus &amp; metro tracking</li>
                  <li className="flex items-center gap-3"><span className="text-custom-blue text-lg">&#10003;</span>Save up to 3 favorite routes</li>
                  <li className="flex items-center gap-3"><span className="text-custom-blue text-lg">&#10003;</span>Basic push notifications</li>
                </ul>
                <button className="w-full border border-gray-600 text-white py-4 rounded-full font-semibold hover:border-white transition">
                  Get Started
                </button>
              </div>
              {/* Pro */}
              <div className="bg-custom-blue rounded-3xl p-10 flex flex-col relative overflow-hidden">
                <div className="absolute top-6 right-6 bg-white/20 text-white text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full">Popular</div>
                <p className="text-sm uppercase tracking-widest text-blue-200 mb-4">Pro</p>
                <p className="text-5xl font-bold mb-2">$4.99<span className="text-lg font-normal text-blue-200">/mo</span></p>
                <p className="text-blue-100 mb-8">For daily commuters who want it all.</p>
                <ul className="space-y-3 text-blue-50 mb-10 flex-1">
                  <li className="flex items-center gap-3"><span className="text-white text-lg">&#10003;</span>Unlimited favorite routes</li>
                  <li className="flex items-center gap-3"><span className="text-white text-lg">&#10003;</span>Smart scheduled alerts</li>
                  <li className="flex items-center gap-3"><span className="text-white text-lg">&#10003;</span>Custom API connectors</li>
                  <li className="flex items-center gap-3"><span className="text-white text-lg">&#10003;</span>Priority support</li>
                </ul>
                <button className="w-full bg-white text-custom-blue py-4 rounded-full font-semibold hover:bg-blue-50 transition">
                  Upgrade to Pro
                </button>
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </main>

    </>
  );
}
