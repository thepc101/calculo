import { Link } from '@tanstack/react-router';

const plans = [
  {
    name: 'Hobby',
    price: '$0',
    description: 'For side projects and experimentation.',
    features: [
      '1,000 evaluations/month',
      '1 project',
      'Community support',
      'Basic analytics',
      'REST API access',
    ],
    cta: 'Get Started',
    href: '/signup',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$29',
    description: 'For production applications.',
    features: [
      '100,000 evaluations/month',
      '10 projects',
      'Email support',
      'Advanced analytics',
      'Custom themes',
      'Graphing engine',
      'API key management',
      'Team members',
    ],
    cta: 'Start Free Trial',
    href: '/signup',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large-scale deployments.',
    features: [
      'Unlimited evaluations',
      'Unlimited projects',
      'Priority support',
      'SLA guarantee',
      'Custom integrations',
      'SSO/SAML',
      'Audit logs',
      'Dedicated infrastructure',
      'On-premise deployment',
    ],
    cta: 'Contact Sales',
    href: '#',
    featured: false,
  },
];

export function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          Start for free. Scale as you grow. No hidden fees.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl border p-8 ${
              plan.featured
                ? 'border-zinc-600 bg-zinc-900 relative'
                : 'border-zinc-800 bg-zinc-900/50'
            }`}
          >
            {plan.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-zinc-100 text-zinc-900 text-xs font-medium rounded-full">
                Most Popular
              </div>
            )}
            <h2 className="text-xl font-bold mb-2">{plan.name}</h2>
            <div className="mb-4">
              <span className="text-4xl font-bold">{plan.price}</span>
              {plan.price !== 'Custom' && <span className="text-zinc-400 ml-1">/month</span>}
            </div>
            <p className="text-sm text-zinc-400 mb-8">{plan.description}</p>
            <ul className="space-y-3 mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-zinc-300">
                  <svg className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              to={plan.href}
              className={`block text-center rounded-xl py-3 text-sm font-semibold transition-colors ${
                plan.featured
                  ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                  : 'border border-zinc-700 hover:bg-zinc-800'
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
