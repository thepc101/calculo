import { Link } from '@tanstack/react-router';

export function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-8">
        <Link to="/" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors inline-flex items-center gap-1 mb-4">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-zinc-500">Last updated: July 7, 2026</p>
      </div>

      <div className="space-y-8 text-sm text-zinc-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using calculo ("the Service"), you agree to be bound by these Terms of Service. 
            If you do not agree to all the terms, you may not access or use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">2. Description of Service</h2>
          <p>
            calculo provides a calculation infrastructure platform including an API, SDK, embeddable widgets, 
            and web application for evaluating mathematical expressions, generating graphs, and managing 
            calculator configurations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">3. Open Source License</h2>
          <p>
            The calculo source code is licensed under the MIT License. You are free to use, modify, 
            and distribute the software in accordance with the terms of that license. The MIT License 
            applies to the software code only and does not extend to the hosted Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">4. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and 
            for all activities that occur under your account. You must notify us immediately of any 
            unauthorized use of your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">5. Acceptable Use</h2>
          <p>
            You agree not to use the Service for any unlawful purpose or in violation of any applicable 
            laws or regulations. You may not attempt to disrupt, degrade, or impair the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">6. API Rate Limits</h2>
          <p>
            Usage of the API may be subject to rate limits. Excessive use that degrades service for 
            other users may result in temporary or permanent suspension of access.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">7. Disclaimer of Warranties</h2>
          <p>
            The Service is provided "as is" without any warranty of any kind, express or implied. 
            We do not guarantee that the Service will be uninterrupted, timely, secure, or error-free.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">8. Limitation of Liability</h2>
          <p>
            In no event shall calculo be liable for any indirect, incidental, special, consequential, 
            or punitive damages arising out of or related to your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will notify users of material 
            changes via email or through the Service. Continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">10. Contact</h2>
          <p>
            For questions about these terms, please open an issue on our GitHub repository or contact 
            us through the community channels.
          </p>
        </section>
      </div>
    </div>
  );
}
