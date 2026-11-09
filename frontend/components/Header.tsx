'use client';
import Link from 'next/link';

export default function Header({ scrolled }: { scrolled: boolean }) {
    return (
        <header className='fixed top-0 inset-x-0 z-50 overflow-none'>
            <nav className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${scrolled ? 'py-2' : 'py-4'} flex items-center bg-black dark:bg-gray-800 rounded-[20px] m-4 transition-all duration-300 ease-in-out relative`}>
                {/* Logo - always left */}
                <div className={`${scrolled ? 'text-xl' : 'text-2xl'} font-bold text-white transition-all duration-300 ease-in-out shrink-0`}>
                    <a href="/#home">Transit Tracker</a>
                </div>

                {/* Nav links - right by default, slides to center when scrolled */}
                <div className="flex-1 flex justify-center">
                    <ul className={`flex space-x-0 bg-darkgray px-0 py-0 rounded-[20px] transition-all duration-700 ease-in-out ${scrolled ? 'translate-x-0' : 'translate-x-[calc(90%-2rem)]'}`}>
                        <li>
                            <a href="/#features" className={`text-white ${scrolled ? 'px-6 py-2' : 'px-6 py-4'} hover:bg-hover-darkgray rounded-[20px] inline-block transition-all duration-300 ease-in-out`}>
                                Features
                            </a>
                        </li>
                        <li>
                            <a href="/#pricing" className={`text-white ${scrolled ? 'px-6 py-2' : 'px-6 py-4'} hover:bg-hover-darkgray rounded-[20px] inline-block transition-all duration-300 ease-in-out`}>
                                Pricing
                            </a>
                        </li>
                        <li>
                            <Link href="/contact" className={`text-white ${scrolled ? 'px-6 py-2' : 'px-6 py-4'} hover:bg-hover-darkgray rounded-[20px] inline-block transition-all duration-300 ease-in-out`}>
                                Contact
                            </Link>
                        </li>
                        {/* Login inside the pill when not scrolled */}
                        <li className={`transition-all duration-300 ease-in-out ${scrolled ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                            <Link href="/login" className={`bg-white text-black ${scrolled ? 'px-6 py-2' : 'px-6 py-4'} rounded-[20px] hover:bg-gray-300 inline-block transition-all duration-300 ease-in-out whitespace-nowrap`}>
                                Log in
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* Login button - fixed right when scrolled */}
                <div className={`shrink-0 transition-all duration-300 ease-in-out ${scrolled ? 'ml-2 w-auto opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                    <Link href="/login" className="bg-white text-black px-6 py-2 rounded-[20px] hover:bg-gray-300 inline-block transition-all duration-300 ease-in-out whitespace-nowrap">
                        Log in
                    </Link>
                </div>
            </nav>
        </header>
    );
}
