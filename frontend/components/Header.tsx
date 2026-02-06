'use client';
import Link from 'next/link';

export default function Header({ scrolled }: { scrolled: boolean }) {
    return (
        <header className='fixed top-0 inset-x-0 z-50 overflow-none'>
            <nav className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${scrolled ? 'py-2' : 'py-4'} flex justify-between items-center bg-black dark:bg-gray-800 rounded-[20px] m-4 transition-all duration-300 ease-in-out`}>
                <div className={`${scrolled ? 'text-xl' : 'text-2xl'} font-bold text-white transition-all duration-300 ease-in-out`}>
                    <a href="/#home">Transit Tracker</a>
                </div>
                
                <ul className={`flex space-x-0 bg-gray-700 dark:bg-gray-800 px-0 ${scrolled ? 'py-0' : 'py-0'} rounded-[20px] transition-all duration-300 ease-in-out`}>
                    <li>
                        <a href="/#features" className={`text-white ${scrolled ? 'px-6 py-2' : 'px-6 py-4'} hover:bg-gray-600 dark:hover:bg-gray-700 rounded-[20px] inline-block transition-all duration-300 ease-in-out`}>
                            Features
                        </a>
                    </li>
                    <li>
                        <a href="/#pricing" className={`text-white ${scrolled ? 'px-6 py-2' : 'px-6 py-4'} hover:bg-gray-600 dark:hover:bg-gray-700 rounded-[20px] inline-block transition-all duration-300 ease-in-out`}>
                            Pricing
                        </a>
                    </li>
                    <li>
                        <Link href="/contact" className={`text-white ${scrolled ? 'px-6 py-2' : 'px-6 py-4'} hover:bg-gray-600 dark:hover:bg-gray-700 rounded-[20px] inline-block transition-all duration-300 ease-in-out`}>
                            Contact
                        </Link>
                    </li>
                    <li className={`${scrolled ? 'hidden' : 'block'} transition-all duration-300 ease-in-out`}>
                        <Link href="/login" className="bg-white text-black px-6 py-4 rounded-[20px] hover:bg-gray-300 inline-block transition-all duration-300 ease-in-out">
                            Log in
                        </Link>
                    </li>
                </ul>

                <div className={`${scrolled ? 'block' : 'hidden'} transition-all duration-300 ease-in-out`}>
                    <Link href="/login" className="bg-white text-black px-6 py-2 rounded-[20px] hover:bg-gray-300 inline-block transition-all duration-300 ease-in-out">
                        Log in
                    </Link>
                </div>
            </nav>
        </header>
    );
}