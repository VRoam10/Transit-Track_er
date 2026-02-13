'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Train, Bus, MapPin, Bell, Github, Twitter, Mail, ArrowUpRight, ChevronUp } from 'lucide-react';

export default function Footer() {
    const [token, setToken] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        setToken(localStorage.getItem('token'));
    }, []);

    return (
    <footer className="snap-center min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
        {/* Background transit SVG illustration */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            {/* Metro lines criss-crossing */}
            <line x1="0" y1="20%" x2="35%" y2="20%" stroke="#017aeb" strokeOpacity="0.15" strokeWidth="3" />
            <line x1="35%" y1="20%" x2="50%" y2="45%" stroke="#017aeb" strokeOpacity="0.15" strokeWidth="3" />
            <line x1="50%" y1="45%" x2="100%" y2="45%" stroke="#017aeb" strokeOpacity="0.15" strokeWidth="3" />

            <line x1="0" y1="60%" x2="25%" y2="60%" stroke="#FF1F22" strokeOpacity="0.12" strokeWidth="3" />
            <line x1="25%" y1="60%" x2="40%" y2="35%" stroke="#FF1F22" strokeOpacity="0.12" strokeWidth="3" />
            <line x1="40%" y1="35%" x2="75%" y2="35%" stroke="#FF1F22" strokeOpacity="0.12" strokeWidth="3" />
            <line x1="75%" y1="35%" x2="100%" y2="55%" stroke="#FF1F22" strokeOpacity="0.12" strokeWidth="3" />

            <line x1="0" y1="80%" x2="30%" y2="80%" stroke="#22c55e" strokeOpacity="0.1" strokeWidth="3" />
            <line x1="30%" y1="80%" x2="55%" y2="65%" stroke="#22c55e" strokeOpacity="0.1" strokeWidth="3" />
            <line x1="55%" y1="65%" x2="100%" y2="65%" stroke="#22c55e" strokeOpacity="0.1" strokeWidth="3" />

            {/* Station dots on blue line */}
            <circle cx="10%" cy="20%" r="5" fill="#017aeb" fillOpacity="0.25" />
            <circle cx="22%" cy="20%" r="5" fill="#017aeb" fillOpacity="0.25" />
            <circle cx="35%" cy="20%" r="7" fill="#017aeb" fillOpacity="0.3" stroke="#017aeb" strokeOpacity="0.2" strokeWidth="2" />
            <circle cx="50%" cy="45%" r="7" fill="#017aeb" fillOpacity="0.3" stroke="#017aeb" strokeOpacity="0.2" strokeWidth="2" />
            <circle cx="70%" cy="45%" r="5" fill="#017aeb" fillOpacity="0.25" />
            <circle cx="88%" cy="45%" r="5" fill="#017aeb" fillOpacity="0.25" />

            {/* Station dots on red line */}
            <circle cx="12%" cy="60%" r="5" fill="#FF1F22" fillOpacity="0.2" />
            <circle cx="25%" cy="60%" r="7" fill="#FF1F22" fillOpacity="0.25" stroke="#FF1F22" strokeOpacity="0.15" strokeWidth="2" />
            <circle cx="40%" cy="35%" r="7" fill="#FF1F22" fillOpacity="0.25" stroke="#FF1F22" strokeOpacity="0.15" strokeWidth="2" />
            <circle cx="58%" cy="35%" r="5" fill="#FF1F22" fillOpacity="0.2" />
            <circle cx="75%" cy="35%" r="7" fill="#FF1F22" fillOpacity="0.25" stroke="#FF1F22" strokeOpacity="0.15" strokeWidth="2" />

            {/* Station dots on green line */}
            <circle cx="15%" cy="80%" r="5" fill="#22c55e" fillOpacity="0.2" />
            <circle cx="30%" cy="80%" r="7" fill="#22c55e" fillOpacity="0.25" stroke="#22c55e" strokeOpacity="0.15" strokeWidth="2" />
            <circle cx="55%" cy="65%" r="7" fill="#22c55e" fillOpacity="0.25" stroke="#22c55e" strokeOpacity="0.15" strokeWidth="2" />
            <circle cx="78%" cy="65%" r="5" fill="#22c55e" fillOpacity="0.2" />

            {/* Transfer station (intersection) */}
            <circle cx="50%" cy="45%" r="12" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="2" />
            <circle cx="40%" cy="35%" r="12" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="2" />

            {/* Decorative large faded circles */}
            <circle cx="90%" cy="15%" r="150" fill="none" stroke="white" strokeOpacity="0.03" strokeWidth="1.5" />
            <circle cx="90%" cy="15%" r="200" fill="none" stroke="white" strokeOpacity="0.02" strokeWidth="1.5" />
            <circle cx="5%" cy="90%" r="120" fill="none" stroke="white" strokeOpacity="0.03" strokeWidth="1.5" />
        </svg>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-6 md:px-16 lg:px-24 py-20">
            {/* Top section: brand + CTA */}
            <div className="max-w-7xl mx-auto w-full mb-20">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-custom-blue rounded-xl flex items-center justify-center">
                                <Train className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-2xl font-bold tracking-tight">Transit Tracker</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold leading-tight max-w-lg">
                            Your city,<br />
                            <span className="text-custom-blue">always on track.</span>
                        </h2>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => router.push(token ? '/dashboard' : '/login')}
                            className="bg-custom-blue text-white px-8 py-4 rounded-full font-semibold hover:brightness-110 transition flex items-center gap-2 justify-center"
                        >
                            {token ? 'Go to Dashboard' : 'Get Started'}
                            <ArrowUpRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="border border-zinc-700 text-white px-8 py-4 rounded-full font-semibold hover:border-zinc-500 transition flex items-center gap-2 justify-center"
                        >
                            Back to Top
                            <ChevronUp className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Middle section: links grid */}
            <div className="max-w-7xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-10 mb-20">
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-5">Product</h3>
                    <ul className="space-y-3">
                        <li><Link href="/#features" className="text-zinc-400 hover:text-white transition flex items-center gap-2"><MapPin className="w-4 h-4" /> Features</Link></li>
                        <li><Link href="/#pricing" className="text-zinc-400 hover:text-white transition flex items-center gap-2"><Bell className="w-4 h-4" /> Pricing</Link></li>
                        <li><Link href="/#tutorials" className="text-zinc-400 hover:text-white transition flex items-center gap-2"><Train className="w-4 h-4" /> How It Works</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-5">Transit</h3>
                    <ul className="space-y-3">
                        <li><span className="text-zinc-400 flex items-center gap-2"><Train className="w-4 h-4 text-custom-blue" /> Metro Lines</span></li>
                        <li><span className="text-zinc-400 flex items-center gap-2"><Bus className="w-4 h-4 text-custom-red" /> Bus Routes</span></li>
                        <li><span className="text-zinc-400 flex items-center gap-2"><MapPin className="w-4 h-4 text-green-500" /> Live Map</span></li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-5">Legal</h3>
                    <ul className="space-y-3">
                        <li><Link href="/rgpd" className="text-zinc-400 hover:text-white transition">Privacy Policy</Link></li>
                        <li><Link href="/contact" className="text-zinc-400 hover:text-white transition">Contact Us</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-5">Connect</h3>
                    <div className="flex gap-3">
                        <a href="#" className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 transition flex items-center justify-center">
                            <Github className="w-5 h-5 text-zinc-400" />
                        </a>
                        <a href="#" className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 transition flex items-center justify-center">
                            <Twitter className="w-5 h-5 text-zinc-400" />
                        </a>
                        <a href="#" className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 transition flex items-center justify-center">
                            <Mail className="w-5 h-5 text-zinc-400" />
                        </a>
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="max-w-7xl mx-auto w-full border-t border-zinc-800 pt-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-zinc-500 text-sm">&copy; {new Date().getFullYear()} Transit Tracker. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        {/* Mini transit line decoration */}
                        <div className="hidden md:flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-custom-blue" />
                            <div className="w-8 h-0.5 bg-custom-blue/40" />
                            <div className="w-2 h-2 rounded-full bg-custom-red" />
                            <div className="w-8 h-0.5 bg-custom-red/40" />
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                        <p className="text-zinc-600 text-sm">Built for commuters, by commuters.</p>
                    </div>
                </div>
            </div>
        </div>
    </footer>
    );
}
