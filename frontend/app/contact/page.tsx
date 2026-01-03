'use client';

import Link from 'next/link';

export default function Contact() {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Handle form submission here
        console.log('Form submitted');
    };

    return (
        <>
            <header className="sticky top-0 z-50 bg-white shadow">
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="text-2xl font-bold text-blue-600">
                        <Link href="/">Transit Tracker</Link>
                    </div>
                    <ul className="flex space-x-8">
                        <li>
                            <a href="/#features" className="text-gray-700 hover:text-blue-600">Features</a>
                        </li>
                        <li>
                            <a href="/#pricing" className="text-gray-700 hover:text-blue-600">Pricing</a>
                        </li>
                        <li>
                            <Link href="/contact" className="text-gray-700 hover:text-blue-600">Contact</Link>
                        </li>
                    </ul>
                </nav>
            </header>

            <main>
                <section className="contact py-20 px-4">
                    <div className="max-w-3xl mx-auto">
                        <h1 className="text-4xl font-bold text-center mb-4">Get in Touch</h1>
                        <p className="text-center text-gray-600 mb-12">Have questions? We're here to help across Europe.</p>

                        <div className="bg-white p-8 rounded-lg shadow-lg">
                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                                    >
                                        <option value="">Select a country</option>
                                        <option value="france">France</option>
                                        <option value="germany">Germany</option>
                                        <option value="uk">United Kingdom</option>
                                        <option value="italy">Italy</option>
                                        <option value="spain">Spain</option>
                                        <option value="netherlands">Netherlands</option>
                                        <option value="belgium">Belgium</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                                    <textarea
                                        rows={5}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition"
                                >
                                    Send Message
                                </button>
                            </form>
                        </div>

                        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-white p-6 rounded-lg shadow text-center">
                                <h3 className="text-xl font-bold text-blue-600 mb-2">Email</h3>
                                <p className="text-gray-600">support@transitttracker.eu</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow text-center">
                                <h3 className="text-xl font-bold text-blue-600 mb-2">Response Time</h3>
                                <p className="text-gray-600">24-48 hours</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow text-center">
                                <h3 className="text-xl font-bold text-blue-600 mb-2">Languages</h3>
                                <p className="text-gray-600">EN, FR, DE, IT, ES</p>
                            </div>
                        </div>
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
