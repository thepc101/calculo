import { createRootRoute, createRoute } from '@tanstack/react-router';
import { Layout } from '../components/layout';
import { LandingPage } from '../pages/landing';
import { DocsPage } from '../pages/docs';
import { ApiPage } from '../pages/api';
import { ExamplesPage } from '../pages/examples';
import { PlaygroundPage } from '../pages/playground';
import { PricingPage } from '../pages/pricing';
import { BlogPage } from '../pages/blog';
import { ChangelogPage } from '../pages/changelog';
import { ForumPage } from '../pages/forum';
import { LoginPage } from '../pages/login';
import { SignupPage } from '../pages/signup';
import { DashboardPage } from '../pages/dashboard';
import { TermsOfServicePage } from '../pages/terms-of-service';
import { PrivacyPolicyPage } from '../pages/privacy-policy';
import { NotFoundPage } from '../pages/not-found';

const rootRoute = createRootRoute({
  component: Layout,
  notFoundComponent: NotFoundPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
});

const docsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/docs',
  component: DocsPage,
});

const apiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/api',
  component: ApiPage,
});

const examplesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/examples',
  component: ExamplesPage,
});

const playgroundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/playground',
  component: PlaygroundPage,
});

const pricingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pricing',
  component: PricingPage,
});

const blogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/blog',
  component: BlogPage,
});

const changelogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/changelog',
  component: ChangelogPage,
});

const forumRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forum',
  component: ForumPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  component: SignupPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardPage,
});

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms',
  component: TermsOfServicePage,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy',
  component: PrivacyPolicyPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  docsRoute,
  apiRoute,
  examplesRoute,
  playgroundRoute,
  pricingRoute,
  blogRoute,
  changelogRoute,
  forumRoute,
  loginRoute,
  signupRoute,
  dashboardRoute,
  termsRoute,
  privacyRoute,
]);

export { routeTree };
