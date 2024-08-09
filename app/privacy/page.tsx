import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function PrivacyPolicy() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <div className="prose dark:prose-invert">
          <p>Last updated: [Date]</p>
          <p>Render Quest (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and disclosed by RenderQuest.</p>
          
          <h2>Information We Collect</h2>
          <p>[Add details about the information you collect]</p>
          
          <h2>How We Use Your Information</h2>
          <p>[Explain how you use the collected information]</p>
          
          <h2>Information Sharing and Disclosure</h2>
          <p>[Describe how and when you might share user information]</p>
          
          <h2>Data Security</h2>
          <p>[Explain your security measures]</p>
          
          <h2>Your Rights</h2>
          <p>[Describe user rights regarding their data]</p>
          
          <h2>Changes to This Privacy Policy</h2>
          <p>Explain how you will notify users of changes</p>
          
          <h2>Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at: info@humanquest.net</p>
        </div>
      </main>
      <Footer />
    </>
  );
}