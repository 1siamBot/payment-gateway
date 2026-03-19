<template>
  <div class="app-shell">
    <header class="global-nav" role="navigation" aria-label="Global">
      <NuxtLink class="global-nav-link" to="/">Operations workspace</NuxtLink>
      <NuxtLink class="global-nav-link" to="/route-map">Route map</NuxtLink>
      <NuxtLink class="global-nav-link" to="/settlement-chargeback-monitor">Chargeback monitor</NuxtLink>
      <NuxtLink class="global-nav-link" to="/payment-attempt-timeline">Attempt timeline</NuxtLink>
      <NuxtLink class="global-nav-link" to="/release-gate-evidence-digest">Release-gate digest</NuxtLink>
    </header>
    <main>
      <NuxtPage />
    </main>
  </div>
</template>
