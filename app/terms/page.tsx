import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function TermsOfService() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <div className="prose dark:prose-invert">
          <p>Last updated: [Date]</p>
          <p>Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the Render Quest website (the "Service") operated by Render Quest ("us", "we", or "our").</p>
          
          <h2>1. Terms</h2>
          <p>By accessing the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.</p>
          
          <h2>2. Use License</h2>
          <p>[Describe the license for using your content]</p>
          
          <h2>3. Disclaimer</h2>
          <p>[Add any disclaimers about your service]</p>
          
          <h2>4. Limitations</h2>
          <p>[Describe any limitations of liability]</p>
          
          <h2>5. Revisions and Errata</h2>
          <p>[Explain how you handle errors or changes in content]</p>
          
          <h2>6. Links</h2>
          <p>[Describe your policy on external links]</p>
          
          <h2>7. Site Terms of Use Modifications</h2>
          <p>[Explain how and when you might modify these terms]</p>
          
          <h2>8. Governing Law</h2>
          <p>[Specify which laws govern the use of your service]</p>
        </div>
      </main>
      <Footer />
    </>
  );
}