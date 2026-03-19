<script setup lang="ts">
const links = [
  {
    title: 'Merchant Setup',
    description: 'Create and review merchants before taking traffic.',
    to: '/payment-flow/merchant-setup',
    cta: 'Open Merchant Setup',
  },
  {
    title: 'Payment Intent Creation',
    description: 'Create deposit/withdraw intents with idempotency-safe payloads.',
    to: '/payment-flow/create-intent',
    cta: 'Open Intent Flow',
  },
  {
    title: 'Payment Status Tracker',
    description: 'Track payment lifecycle by filters and by reference lookup.',
    to: '/payment-flow/status-tracker',
    cta: 'Open Status Tracker',
  },
  {
    title: 'Offline Fixture Harness',
    description: 'Switch deterministic end-to-end scenarios without backend dependency.',
    to: '/payment-flow/fixture-harness?scenario=success',
    cta: 'Open Fixture Harness',
  },
  {
    title: 'Payment Operations Dashboard',
    description: 'History, detail, and deterministic timeline view with fallback fixture modes.',
    to: '/payment-operations-dashboard',
    cta: 'Open Dashboard',
  },
];
</script>

<template>
  <main class="page">
    <section class="hero">
      <h1>Payment Operations Workspace</h1>
      <p>Use dedicated flows for onboarding, intent creation, and lifecycle tracking.</p>
      <div class="inline-actions">
        <NuxtLink class="button-link" to="/">Open Legacy Control Tower</NuxtLink>
      </div>
    </section>

    <section class="flow-grid">
      <article v-for="link in links" :key="link.to" class="card flow-card">
        <h2>{{ link.title }}</h2>
        <p>{{ link.description }}</p>
        <NuxtLink class="button-link" :to="link.to">{{ link.cta }}</NuxtLink>
      </article>
    </section>
  </main>
</template>
