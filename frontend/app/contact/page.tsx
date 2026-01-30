'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';


export default function Contact() {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Handle form submission here
        console.log('Form submitted');
    };

    return (
        <>
            <Header />

            <main>
                <section className="contact py-20 px-4">
                    <div className="max-w-3xl mx-auto">
                        <h1 className="text-4xl font-bold text-center mb-4">Get in Touch</h1>
                        <p className="text-center text-gray-600 dark:text-gray-300 mb-12">Have questions? We're here to help across Europe.</p>

                        <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg">
                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-non"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country</label>
                                    <select
                                        required
                                        className="w-full dark:bg-gray-900 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message</label>
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
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow text-center">
                                <h3 className="text-xl font-bold text-blue-600 mb-2">Email</h3>
                                <p className="text-gray-600 dark:text-gray-300">support@transitttracker.eu</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow text-center">
                                <h3 className="text-xl font-bold text-blue-600 mb-2">Response Time</h3>
                                <p className="text-gray-600 dark:text-gray-300">24-48 hours</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow text-center">
                                <h3 className="text-xl font-bold text-blue-600 mb-2">Languages</h3>
                                <p className="text-gray-600 dark:text-gray-300">EN, FR, DE, IT, ES</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}
