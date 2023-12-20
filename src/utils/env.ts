export type Cluster = 'testnet' | 'mainnet';

const clusterKey = 'cluster';

export function isClusterStored(): boolean {
  const cache = localStorage.getItem(clusterKey);

  return cache != null;
}

export function getCluster(): Cluster {
  const cache = localStorage.getItem(clusterKey);
  const cluster = cache || process.env.CLUSTER;

  return cluster && (cluster === 'mainnet' || cluster === 'testnet') ? cluster : 'mainnet';
}

export function setCluster(cluster: Cluster) {
  localStorage.setItem(clusterKey, cluster);
}
