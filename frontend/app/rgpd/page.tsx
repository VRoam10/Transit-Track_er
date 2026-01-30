'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';


export default function RGPD() {
    return (
        <>
            <Header />

            <main>
                <section className="rgpd py-20 px-4">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-4xl font-bold mb-8">RGPD &amp; Privacy Policy</h1>

                        <div className="bg-white p-8 rounded-lg shadow-lg space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold text-blue-600 mb-4">1. Data Collection</h2>
                                <p className="text-gray-700 mb-2">Transit Tracker collects the following personal data:</p>
                                <ul className="list-disc list-inside text-gray-600 space-y-2">
                                    <li>Account information (name, email, password)</li>
                                    <li>Location data for transit tracking</li>
                                    <li>Device information and app usage analytics</li>
                                    <li>Preferences and saved routes</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-blue-600 mb-4">2. Data Usage</h2>
                                <p className="text-gray-700">We use your data to:</p>
                                <ul className="list-disc list-inside text-gray-600 space-y-2">
                                    <li>Provide real-time transit tracking services</li>
                                    <li>Send notifications and alerts</li>
                                    <li>Improve app functionality and user experience</li>
                                    <li>Comply with legal obligations</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-blue-600 mb-4">3. Data Protection</h2>
                                <p className="text-gray-700">Your data is protected through:</p>
                                <ul className="list-disc list-inside text-gray-600 space-y-2">
                                    <li>Encryption of sensitive information</li>
                                    <li>Secure authentication mechanisms</li>
                                    <li>Regular security audits</li>
                                    <li>Compliance with GDPR/RGPD standards</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-blue-600 mb-4">4. Your Rights</h2>
                                <p className="text-gray-700">Under GDPR/RGPD, you have the right to:</p>
                                <ul className="list-disc list-inside text-gray-600 space-y-2">
                                    <li>Access your personal data</li>
                                    <li>Correct inaccurate data</li>
                                    <li>Request deletion of your data</li>
                                    <li>Restrict data processing</li>
                                    <li>Data portability</li>
                                    <li>Withdraw consent at any time</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-blue-600 mb-4">5. Data Retention</h2>
                                <p className="text-gray-700">Personal data is retained only as long as necessary to provide services. You can request deletion at any time by contacting us.</p>
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-blue-600 mb-4">6. Third-Party Data Sharing</h2>
                                <p className="text-gray-700">We do not share personal data with third parties without your explicit consent, except when required by law.</p>
                            </div>

                            <div className="border-t border-gray-300 pt-6">
                                <p className="text-gray-600 text-sm">For privacy concerns or data requests, contact us at: <a href="mailto:privacy@transitttracker.eu" className="text-blue-600 hover:underline">privacy@transitttracker.eu</a></p>
                                <p className="text-gray-600 text-sm mt-2">Last updated: November 2024</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}
