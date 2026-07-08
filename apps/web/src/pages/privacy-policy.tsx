import { Link } from '@tanstack/react-router';

export function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-8">
        <Link to="/" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors inline-flex items-center gap-1 mb-4">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-500">Last updated: July 7, 2026</p>
      </div>

      <div className="space-y-8 text-sm text-zinc-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">1. Information We Collect</h2>
          <p>
            We collect information you provide when creating an account, including your name, email address, 
            and authentication credentials. We also collect usage data such as API request logs and 
            calculator configurations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">2. How We Use Information</h2>
          <p>
            We use your information to provide and improve the Service, process API requests, manage 
            your account, communicate with you about the Service, and ensure security and compliance 
            with our Terms of Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">3. Data Storage</h2>
          <p>
            The interactive demo and client-side calculator evaluation run entirely in your browser. 
            No calculation data is sent to our servers unless you explicitly use the REST API. 
            Account data is stored securely using industry-standard encryption.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">4. Third-Party Services</h2>
          <p>
            We use Supabase for authentication and database services, GitHub for source code hosting, 
            and Vercel for hosting the web application. Each service has its own privacy policy 
            governing data handling.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">5. Data Sharing</h2>
          <p>
            We do not sell your personal information. We may share data with service providers 
            necessary to operate the Service, as required by law, or with your consent.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">6. Data Retention</h2>
          <p>
            We retain your account information until you delete your account. API logs are retained 
            for up to 90 days for security and debugging purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">7. Your Rights</h2>
          <p>
            You may access, update, or delete your account information at any time through your 
            account settings. You may also contact us to request data deletion or export.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">8. Security</h2>
          <p>
            We implement appropriate security measures including encryption in transit and at rest, 
            access controls, and regular security reviews to protect your data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify users of material 
            changes via email or through the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">10. Contact</h2>
          <p>
            For privacy-related inquiries, please open an issue on our GitHub repository or contact 
            us through the community channels.
          </p>
        </section>
      </div>
    </div>
  );
}
