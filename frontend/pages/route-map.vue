<script setup lang="ts">
import { computed } from 'vue';
import { CORE_ROUTE_INVENTORY, INTENTIONAL_EXCLUSIONS, type RouteInventoryEntry } from '../utils/routeInventory';

type RouteGroupKey = RouteInventoryEntry['category'];

type GroupDef = {
  key: RouteGroupKey;
  title: string;
  description: string;
};

const GROUPS: GroupDef[] = [
  { key: 'core', title: 'Core Entry', description: 'Primary entry points and navigation anchors.' },
  { key: 'operations', title: 'Operations', description: 'Day-to-day payment and exception operations pages.' },
  { key: 'flow', title: 'Payment Flow', description: 'Step-by-step merchant and payment flow scenarios.' },
  { key: 'remediation', title: 'Remediation', description: 'Release readiness and remediation planning pages.' },
];

const groupedRoutes = computed(() =>
  GROUPS.map((group) => ({
    ...group,
    routes: CORE_ROUTE_INVENTORY.filter((entry) => entry.category === group.key),
  })),
);
</script>

<template>
  <div class="page route-map-page">
    <section class="hero">
      <h1>Frontend Route Map</h1>
      <p>Canonical inventory for main-brand frontend pages. Use this map to validate full system baseline coverage.</p>
    </section>

    <section class="card">
      <h2>Coverage Snapshot</h2>
      <p>
        Routes tracked: <strong>{{ CORE_ROUTE_INVENTORY.length }}</strong>
      </p>
      <p>
        Intentional exclusions: <strong>{{ INTENTIONAL_EXCLUSIONS.length }}</strong>
      </p>
      <div class="inline-actions">
        <NuxtLink class="button-link" to="/">Open Main Console</NuxtLink>
        <NuxtLink class="button-link" to="/payment-reconciliation-workspace">Open Reconciliation Workspace</NuxtLink>
      </div>
    </section>

    <section class="card route-map-groups">
      <h2>Route Inventory</h2>
      <div v-for="group in groupedRoutes" :key="group.key" class="route-group">
        <h3>{{ group.title }}</h3>
        <p class="route-group-copy">{{ group.description }}</p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Path</th>
                <th>Page</th>
                <th>Source Issue</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in group.routes" :key="entry.path">
                <td><NuxtLink :to="entry.path">{{ entry.path }}</NuxtLink></td>
                <td>{{ entry.title }}</td>
                <td>{{ entry.sourceIssue }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Intentional Exclusions</h2>
      <ul>
        <li v-for="item in INTENTIONAL_EXCLUSIONS" :key="item.area">
          <strong>{{ item.area }}</strong>
          <p>{{ item.rationale }}</p>
          <p>Tracked by: {{ item.trackingIssue }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>
